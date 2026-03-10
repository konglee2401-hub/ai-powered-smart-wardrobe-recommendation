import { useState } from 'react';
import './AIImage.css';

export default function AIImage({ src, alt = '', size = null, className = '', imageClassName = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [particles] = useState(() => (
    Array.from({ length: 10 }, () => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
    }))
  ));

  const boxStyle = size ? { width: size, height: size } : undefined;

  return (
    <div className={`ai-box ${className}`.trim()} style={boxStyle}>
      {(!loaded || !src) && (
        <div className="ai-loader">
          <div className="ai-shimmer" />
          <div className="ai-particles">
            {particles.map((particle, index) => (
              <span
                key={index}
                style={{
                  left: particle.left,
                  animationDelay: particle.delay,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {src && (
        <img
          src={src}
          alt={alt}
          className={`ai-img ${loaded ? 'show' : ''} ${imageClassName}`.trim()}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}

