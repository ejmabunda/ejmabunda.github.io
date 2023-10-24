import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLinkedin,
  faGithub,
  faTwitter,
} from "@fortawesome/free-brands-svg-icons";
function Contact() {
  return (
    <>
      <section id="contact" className="p-5 container">
        <div className="row">
          <h2 className="mb-4">Let's Connect</h2>
          <div className="d-flex gap-3">
            <a
              href="https://www.linkedin.com/in/mjmabunda/"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faLinkedin} /> LinkedIn
            </a>
            <a
              href="https://github.com/ejmabunda"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faGithub} /> GitHub
            </a>
            <a
              href="https://twitter.com/mjmabunda0"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faTwitter} /> Twitter
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default Contact;
