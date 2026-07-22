import { signInWithGoogle } from "./firebase";

// The signed-out page. It has one job: say what this is for, in the voice the
// app itself uses, and get out of the way.
export default function Landing() {
  return (
    <div className="landing">
      <header className="lhero">
        <div className="lmark">◈</div>
        <h1>Minerva</h1>
        <p className="llede">
          A quiet place to write the day down, and someone to read it back to
          you — so you can see what actually lifts you, and what keeps taking
          more than it gives.
        </p>
        <button className="primary" onClick={() => signInWithGoogle()}>
          Continue with Google
        </button>
        <span className="lnote">Free to try · Your journal stays yours</span>
      </header>

      <section className="lfeatures">
        <div className="lfeature">
          <span className="lnum">01</span>
          <h3>One day, one page</h3>
          <p>
            Write once, at the end of the day. No feed, no streak, nothing to
            keep up with. When the day is done, it's done.
          </p>
        </div>
        <div className="lfeature">
          <span className="lnum">02</span>
          <h3>Your energy, in colour</h3>
          <p>
            Rate the day and watch the weeks take shape. The pattern you can't
            see from inside a hard week is obvious from a month away.
          </p>
        </div>
        <div className="lfeature">
          <span className="lnum">03</span>
          <h3>What you did, kept</h3>
          <p>
            Every win and every kindness is pulled out and held onto — so on the
            days you've forgotten who you are, there's a record to show you.
          </p>
        </div>
      </section>

      <footer className="lfoot">
        <p className="creed">
          Just in case no one has told you yet today: you are doing better than
          you think.
        </p>
        <button className="primary" onClick={() => signInWithGoogle()}>
          Begin
        </button>
      </footer>
    </div>
  );
}
