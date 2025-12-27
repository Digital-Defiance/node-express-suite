import { motion } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import "./Hero.css";

interface HeroProps {
  scrollY: number;
}

const Hero = ({ scrollY }: HeroProps) => {
  const parallaxOffset = scrollY * 0.5;

  return (
    <section className="hero" id="home">
      <div
        className="hero-background"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <div className="particles" />
      </div>

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <span className="badge-text">🚀 Complete Backend Framework for Express Suite</span>
        </motion.div>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Node Express Suite
        </motion.h1>

        <motion.h2
          className="hero-subtitle gradient-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Complete Backend Infrastructure for Secure Applications
        </motion.h2>

        <motion.p
          className="hero-description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Production-ready Node.js/Express framework with MongoDB, JWT authentication,
          <br />
          RBAC, ECIES encryption, and multi-language support. MERN stack made simple.
          <br />
          <span className="hero-highlight">
            🔐 ECIES Encryption • 🔑 JWT Auth • 🌍 8+ Languages • 👥 RBAC • 📊 Dynamic Models • 🛡️ Secure by Design
          </span>
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <a
            href="https://github.com/Digital-Defiance/express-suite/tree/main/packages/digitaldefiance-node-express-suite"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
            View on GitHub
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <div className="mouse">
          <div className="wheel" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
