import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoCloseOutline, IoPeopleOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';
import { useAuth } from '../context/AuthContext';
import { requestJson } from '../services/api';
import '../styles/login.css';

export default function Login() {
  const location = useLocation();
  const isWellwisherRoute = location.pathname.startsWith('/wellwisher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(isWellwisherRoute ? 'wellwisher' : 'learner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const showSignupCta = error.toLowerCase().includes('invalid credentials');
  const destinationPath = selectedRole === 'wellwisher' ? '/wellwisher' : '/';
  const registerPath = selectedRole === 'wellwisher' ? '/wellwisher/register' : '/register';

  useEffect(() => {
    setSelectedRole(isWellwisherRoute ? 'wellwisher' : 'learner');
  }, [isWellwisherRoute]);

  const roleCopy = useMemo(() => {
    if (selectedRole === 'wellwisher') {
      return {
        title: 'Wellwisher Login',
        subtitle: 'Monitor progress, assign tasks, and guide focus sessions in real time.',
      };
    }
    return {
      title: 'Welcome Back',
      subtitle: 'Sign in to continue to your learning dashboard',
    };
  }, [selectedRole]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError('');
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await requestJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole })
      });

      login(data.user, data.token);
      navigate(destinationPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const { credential } = credentialResponse;
      if (!credential) {
        throw new Error('Google login failed. Missing credential token.');
      }

      const data = await requestJson('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential, role: selectedRole })
      });

      login(data.user, data.token);
      navigate(destinationPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <FloatingParticles />
      <GradientMesh colors={['#574db3', '#9c93fe', '#b8b3ff']} />

      {error && (
        <motion.div
          className="login-error-popup"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="login-error-popup-main">
            <span>{error}</span>
            {showSignupCta && (
              <Link to="/register" className="login-error-link">
                Create account
              </Link>
            )}
          </div>
          <button
            type="button"
            className="login-error-popup-close"
            aria-label="Dismiss error"
            onClick={() => setError('')}
          >
            <IoCloseOutline />
          </button>
        </motion.div>
      )}

      <motion.div className="login-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="login-card-mini-svgs" aria-hidden="true">
          <img src="/mini-spark-book.svg" alt="" className="mini-svg mini-svg-1" />
          <img src="/mini-cap.svg" alt="" className="mini-svg mini-svg-2" />
          <img src="/mini-orbit.svg" alt="" className="mini-svg mini-svg-3" />
          <img src="/mini-cap.svg" alt="" className="mini-svg mini-svg-4" />
          <img src="/mini-spark-book.svg" alt="" className="mini-svg mini-svg-5" />
          <img src="/mini-orbit.svg" alt="" className="mini-svg mini-svg-6" />
        </div>

        {/* Left Section - Branding */}
        <div className="login-branding">
          <motion.div className="login-brand-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <img src="/Educolink%20logo.png" alt="EducoLink" className="login-logo-img" />
            
            <motion.img
              src="/login%20page%20.svg"
              alt="EducoLink login illustration"
              className="login-hero-illustration"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: [0, -10, 0], scale: [1, 1.02, 1] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.35 },
                y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
              }}
            />
          </motion.div>
        </div>

        {/* Right Section - Login Form */}
        <div className="login-form-section">
          <motion.div className="login-form-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <div className="login-form-header">
              <h2>{roleCopy.title}</h2>
              <p>{roleCopy.subtitle}</p>
            </div>

            <div className="role-toggle" role="tablist" aria-label="Select dashboard type">
              <button
                type="button"
                className={`role-toggle-btn ${selectedRole === 'learner' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('learner');
                  navigate('/login', { replace: true });
                }}
              >
                <IoPeopleOutline /> Learner
              </button>
              <button
                type="button"
                className={`role-toggle-btn ${selectedRole === 'wellwisher' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('wellwisher');
                  navigate('/wellwisher/login', { replace: true });
                }}
              >
                <IoShieldCheckmarkOutline /> Wellwisher
              </button>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              {/* Email Input */}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <IoMailOutline className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <div className="password-header">
                  <label htmlFor="password">Password</label>
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot?
                  </Link>
                </div>
                <div className="input-wrapper">
                  <IoLockClosedOutline className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="form-group checkbox">
                <input type="checkbox" id="remember" defaultChecked />
                <label htmlFor="remember">Keep me signed in</label>
              </div>

              {/* Login Button */}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span>Or continue with</span>
            </div>

            {/* Google Auth */}
            {hasGoogleClientId ? (
              <div className="google-login-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => setError('Google login failed. Please try again.')}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="signin_with"
                  width="100%"
                />
              </div>
            ) : (
              <div className="google-client-warning">
                Google sign-in is unavailable. Set VITE_GOOGLE_CLIENT_ID in your frontend environment.
              </div>
            )}

            {/* Sign Up Link */}
            <div className="signup-link">
              Don't have an account? <Link to={registerPath}>Create one</Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="login-decoration decoration-1"></div>
      <div className="login-decoration decoration-2"></div>
    </div>
  );
}
