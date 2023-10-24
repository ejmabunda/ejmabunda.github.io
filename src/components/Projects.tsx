function Projects() {
  return (
    <>
      <section id="projects" className="p-5 container">
        <div className="row">
          <h2 className="px-4 pb-4 m-0 col-md-5">Porfolio</h2>

          <div className="project p-4 col-md-7">
            <h3>AKH website</h3>
            <span className="status">in progress</span>
            <p className="mt-4">
              This is a website I built for AKH, a team of electricians who rock
              at what they do. It's all about showcasing their top-notch
              electrical products, services and company info.
            </p>
            <div className="d-flex gap-3 align-items-center py-2">
              <h4 className="m-0">Tech Stack:</h4>
              <div className="d-flex gap-3 align-items-center">
                <span className="tag">HTML</span>
                <span className="tag">CSS</span>
                <span className="tag">JS</span>
              </div>
            </div>
            <img
              src="/images/akh-designs.png"
              alt="AKH designs"
              className="mb-4"
            />
            <a
              href="https://www.amoskatlego.com/"
              target="_blank"
              className="btn btn-light d-block"
            >
              View Live
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default Projects;
