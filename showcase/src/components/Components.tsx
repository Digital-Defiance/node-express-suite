import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import "./Components.css";

interface Feature {
  title: string;
  description: string;
  icon: string;
  tech: string[];
  highlights: string[];
  category: "Core" | "Interfaces" | "Security" | "Errors" | "Builders";
}

const features: Feature[] = [
  {
    title: "ECIES Encryption/Decryption",
    icon: "🔐",
    description:
      "End-to-end encryption using elliptic curve cryptography with @digitaldefiance/ecies-lib. Secure data transmission and storage with battle-tested crypto primitives.",
    tech: ["ECIES", "Cryptography", "TypeScript"],
    category: "Security",
    highlights: [
      "EciesService - Complete encryption/decryption service",
      "Elliptic curve cryptography (secp256k1)",
      "Integration with @digitaldefiance/ecies-lib v4.1.0",
      "Secure key generation and management",
      "Perfect for end-to-end encrypted applications",
    ],
  },
  {
    title: "JWT Authentication",
    icon: "🔑",
    description:
      "Production-ready JWT authentication with JwtService. Sign and verify tokens with role-based claims, automatic expiration, and secure secret management.",
    tech: ["JWT", "Authentication", "Security"],
    category: "Security",
    highlights: [
      "JwtService with token signing and verification",
      "Role-based claims in token payload",
      "Configurable expiration times",
      "Secure secret management",
      "Integration with Express middleware",
    ],
  },
  {
    title: "Multi-Language i18n",
    icon: "🌍",
    description:
      "Comprehensive internationalization using @digitaldefiance/i18n-lib with 8+ languages. Plugin-based system with automatic locale detection and fallback support.",
    tech: ["i18n", "TypeScript", "Localization"],
    category: "Core",
    highlights: [
      "8+ languages supported (English, French, Spanish, Chinese, Ukrainian, etc.)",
      "Plugin-based architecture for extensibility",
      "Automatic language detection from Accept-Language headers",
      "Fallback language support",
      "Consistent localization across entire application",
    ],
  },
  {
    title: "Role-Based Access Control",
    icon: "👥",
    description:
      "Complete RBAC implementation with RoleService and flexible permission system. Built-in roles (Admin, Member, Guest) with extensible role definitions.",
    tech: ["RBAC", "Express", "Security"],
    category: "Core",
    highlights: [
      "RoleService for role management",
      "Built-in roles (Admin, Member, Guest, etc.)",
      "User-role association with UserRoleService",
      "Permission-based access control",
      "Express middleware integration",
    ],
  },
  {
    title: "Dynamic Model Registry",
    icon: "📊",
    description:
      "Extensible model registration system for MongoDB schemas. Register custom models at runtime and retrieve them anywhere in your application.",
    tech: ["MongoDB", "Mongoose", "TypeScript"],
    category: "Core",
    highlights: [
      "ModelRegistry singleton for centralized model management",
      "Built-in models: User, Role, EmailToken, Mnemonic",
      "Register custom models at runtime",
      "Type-safe model retrieval",
      "Extensible schema definitions",
    ],
  },
  {
    title: "Email Token System",
    icon: "📧",
    description:
      "Complete email token workflow for verification, password reset, and recovery. EmailTokenService with automatic expiration and secure token generation.",
    tech: ["Email", "Security", "TypeScript"],
    category: "Security",
    highlights: [
      "EmailTokenService for token management",
      "Account verification tokens",
      "Password reset workflow",
      "Private key recovery tokens",
      "Mnemonic recovery support",
    ],
  },
  {
    title: "Service Container",
    icon: "⚙️",
    description:
      "Dependency injection with ServiceContainer. Register and resolve services with lifecycle management, singleton support, and type safety.",
    tech: ["DI", "TypeScript", "Architecture"],
    category: "Core",
    highlights: [
      "ServiceContainer with dependency injection",
      "Singleton and transient service lifetimes",
      "Type-safe service resolution",
      "Service definition registry",
      "Reduces coupling and improves testability",
    ],
  },
  {
    title: "Fluent Builder APIs",
    icon: "🏗️",
    description:
      "Type-safe builder pattern for application setup. ApplicationBuilder with fluent API for configuring routes, middleware, plugins, and more.",
    tech: ["TypeScript", "Builder Pattern", "Fluent API"],
    category: "Builders",
    highlights: [
      "ApplicationBuilder for fluent application setup",
      "Validation, Response, Pipeline builders",
      "Route builder with type-safe configuration",
      "Built-in validation and error handling",
      "Reduces boilerplate in application setup",
    ],
  },
];

const Components = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="components section" id="components" ref={ref}>
      <motion.div
        className="components-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Core <span className="gradient-text">Features</span> & Infrastructure
        </h2>
        <p className="components-subtitle">
          Production-ready backend services and infrastructure for secure Node.js applications
        </p>

        <motion.div
          className="suite-intro"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3>
            The <em>complete</em> backend framework for building <em>secure</em>, <em>scalable</em>, and{" "}
            <em>production-ready</em> Node.js applications.
          </h3>
          <p>
            <strong>
              @digitaldefiance/node-express-suite provides a complete backend infrastructure
            </strong>{" "}
            for building secure Node.js/Express applications with MongoDB. From
            JWT authentication and RBAC to ECIES encryption and multi-language support,
            this framework offers{" "}
            <strong>everything you need</strong> to build production-ready applications
            without reinventing the wheel.
          </p>
          <div className="problem-solution">
            <div className="problem">
              <h4>❌ The Challenge: Backend Development Is Complex</h4>
              <ul>
                <li>Setting up authentication and authorization systems</li>
                <li>Implementing encryption and secure data handling</li>
                <li>Managing database models and migrations</li>
                <li>Building email verification and recovery workflows</li>
                <li>Supporting multiple languages and locales</li>
              </ul>
              <p>
                <strong>Result:</strong> You spend weeks building infrastructure
                instead of your core features.
              </p>
            </div>
            <div className="solution">
              <h4>✅ The Solution: Production-Ready Backend Framework</h4>
              <p>
                <strong>node-express-suite</strong> provides{" "}
                <strong>complete authentication</strong> with JWT and RBAC,
                <strong> ECIES encryption</strong> for secure data,{" "}
                <strong>dynamic model registry</strong> for extensible schemas,
                and <strong>multi-language support</strong> for global applications.
              </p>
              <p>
                Built with <strong>MongoDB and Express</strong> and designed for{" "}
                <strong>production use</strong>, this framework includes 604 passing tests
                and comprehensive security features. It provides the complete backend
                for MERN stack applications and can be customized for any use case.
              </p>
            </div>
          </div>
          <div className="value-props">
            <div className="value-prop">
              <strong>🔐 Security First</strong>
              <p>
                JWT authentication, ECIES encryption, PBKDF2 key derivation, and
                comprehensive email token workflows
              </p>
            </div>
            <div className="value-prop">
              <strong>🚀 Production Ready</strong>
              <p>
                604 passing tests, comprehensive error handling, and battle-tested
                in real-world applications
              </p>
            </div>
            <div className="value-prop">
              <strong>🌍 Global Ready</strong>
              <p>
                Multi-language support via @digitaldefiance/i18n-lib with 8+
                languages and automatic locale detection
              </p>
            </div>
            <div className="value-prop">
              <strong>⚙️ Extensible Architecture</strong>
              <p>
                Service container, plugin system, fluent builders, and dynamic
                model registry for maximum flexibility
              </p>
            </div>
          </div>
        </motion.div>

        <div className="components-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="component-card card"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <div className="component-header">
                <div className="component-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <span
                  className={`component-badge ${feature.category.toLowerCase()}`}
                >
                  {feature.category}
                </span>
              </div>

              <p className="component-description">{feature.description}</p>

              <ul className="component-highlights">
                {feature.highlights.map((highlight, i) => (
                  <li key={i}>{highlight}</li>
                ))}
              </ul>

              <div className="component-tech">
                {feature.tech.map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Components;
