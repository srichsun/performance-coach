"""Agentic loop: Claude decides which tools to call, and how many times.

This is the Agent version of the RAG pipeline. Instead of a fixed
"retrieve then answer" flow, the model chooses when to search documents,
when to look up an order, and when it has enough to answer.
"""
from app import config, llm, tools

SYSTEM_PROMPT = (
    "You are a customer-support agent. Use the search_documents tool for "
    "questions about plans, pricing, returns, or warranty, and the "
    "lookup_order tool for order status. Answer using only what the tools "
    "return; if you cannot find the answer, say you don't know. Be concise."
)

MAX_STEPS = 6  # safety cap so a misbehaving loop can't run forever


def run(question: str) -> dict:
    """Answer a question, letting Claude call tools as needed.

    Returns {"answer": str, "tools_used": [tool names in call order]}.
    """
    messages = [{"role": "user", "content": question}]
    tools_used: list[str] = []

    for _ in range(MAX_STEPS):
        response = llm.client.messages.create(
            model=config.CHAT_MODEL,
            max_tokens=config.MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=tools.TOOLS,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            answer = "".join(b.text for b in response.content if b.type == "text")
            return {"answer": answer, "tools_used": tools_used}

        # Claude asked for one or more tools: run them, feed results back.
        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type == "tool_use":
                tools_used.append(block.name)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": tools.dispatch(block.name, block.input),
                    }
                )
        messages.append({"role": "user", "content": results})

    return {"answer": "Stopped after too many steps.", "tools_used": tools_used}
