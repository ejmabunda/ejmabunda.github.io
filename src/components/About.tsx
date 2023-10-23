import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHtml5,
  faCss3,
  faBootstrap,
  faJs,
  faReact,
} from "@fortawesome/free-brands-svg-icons";

function About() {
  return (
    <>
      <section id="about" className="p-4">
        <h2 className="mb-4">About Me</h2>
        <p>
          My mission? To whip up web experiences that aren't just easy on the
          eyes, but also super user-friendly, accessible, and flexible. I mean,
          who wants a site that's stuck in the past, right?
        </p>
        <p>Learning and trying out new web wizardry is my jam.</p>
        <h3 className="mb-4">My Tech Stack:</h3>
        <div className="d-flex justify-content-between mb-4">
          <FontAwesomeIcon icon={faHtml5} size="2x" />
          <FontAwesomeIcon icon={faCss3} size="2x" />
          <FontAwesomeIcon icon={faBootstrap} size="2x" />
          <FontAwesomeIcon icon={faJs} size="2x" />
          <FontAwesomeIcon icon={faReact} size="2x" />
        </div>
        <p>
          Check out my{" "}
          <a
            href="https://drive.google.com/file/d/1Ppl8bx_AGu4f7vGApfYZvaecBmwyCdNA/view?usp=sharing"
            target="_blank"
            rel="noreferrer"
          >
            resume
          </a>
          , and <a href="#contact">contact me</a> if you want to chat.
        </p>
      </section>
    </>
  );
}

export default About;
