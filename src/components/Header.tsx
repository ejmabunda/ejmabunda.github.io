{
  /*import { useState } from "react";*/
}

function Header() {
  {
    /*const [menuVisible, setMenuVisible] = useState(false);

  function toggleMenu() {
    setMenuVisible(!menuVisible);
  }*/
  }

  return (
    <>
      <header id="main-header" className="pb-5 container p-5">
        {/*<nav className="">
          <div
            id="menu-toggle"
            className="d-flex flex-column justify-content-evenly p-0 mb-2"
            onClick={toggleMenu}
          >
            <div className="bar"></div>
            <div className="bar"></div>
          </div>

          <div className="clr"></div>

          <div id="menu" className={`container ${menuVisible ? "open" : ""}`}>
            <div className="row">
              <a href="#about" className="col-md-3" onClick={toggleMenu}>
                About
              </a>
              <a href="#about" className="col-md-3" onClick={toggleMenu}>
                Projects
              </a>
              <a href="#about" className="col-md-3" onClick={toggleMenu}>
                Contact
              </a>
            </div>
          </div>
  </nav>*/}
        <div className="row">
          <div className="col-md-6">
            <p className="mt-5">FRONTEND</p>
            <h1 id="title">Junior Mabunda</h1>
            <p id="subtitle">
              Hi, I’m Junior Mabunda, I craft awesome websites using cool stuff
              like React, Bootstrap and more. <a href="#about">Read more</a>.
            </p>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
