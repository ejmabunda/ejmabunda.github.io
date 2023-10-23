import About from "../components/About";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Projects from "../components/Projects";

function Home() {
  return (
    <>
      <div className="home">
        <Header />
        <About />
        <Projects />
        <Contact />
        <Footer />
      </div>

      <div className="soon flex-column vh-100 justify-content-center text-center p-5">
        <h1>Coming Soon...</h1>
        <p>
          Hey there, right now, I've got this amazing mobile layout ready for
          you. For the bigger screens, I'm building something awesome, and it'll
          be here soon!
          <br />
          <br /> Thanks for your patience, and stay tuned for more awesomeness
          coming your way! 🚀
        </p>
      </div>
    </>
  );
}

export default Home;
