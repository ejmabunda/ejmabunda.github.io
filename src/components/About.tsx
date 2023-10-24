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
      <section id="about" className="p-4 container">
        <div className="row">
          <h2 className="col-md-5">About Me</h2>

          <div className="col-md-7">
            <h3 className="mb-4 fs-1">Modern, Responsive Web Experiences</h3>
            <p>
              My mission? To whip up web experiences that aren't just easy on
              the eyes, but also super user-friendly, accessible, and flexible.
              I mean, who wants a site that's stuck in the past, right?
            </p>
            <p>Learning and trying out new web wizardry is my jam.</p>
            <h3 className="mb-4">My Toolbox:</h3>
            <div className="d-flex gap-5 mb-4 flex-wrap">
              <FontAwesomeIcon icon={faHtml5} size="3x" />
              <FontAwesomeIcon icon={faCss3} size="3x" />
              <FontAwesomeIcon icon={faBootstrap} size="3x" />
              <FontAwesomeIcon icon={faJs} size="3x" />
              <FontAwesomeIcon icon={faReact} size="3x" />
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
          </div>
        </div>
      </section>
    </>
  );
}

export default About;
