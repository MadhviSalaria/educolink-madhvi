import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { IoMailOutline, IoLockClosedOutline, IoPersonOutline, IoEyeOutline, IoEyeOffOutline, IoPeopleOutline, IoShieldCheckmarkOutline, IoLinkOutline } from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';
import { useAuth } from '../context/AuthContext';
import { requestJson } from '../services/api';
import '../styles/login.css';

export default function Register() {
  const location = useLocation();
  const isWellwisherRoute = location.pathname.startsWith('/wellwisher');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(isWellwisherRoute ? 'wellwisher' : 'learner');
  const [learnerCode, setLearnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const loginPath = selectedRole === 'wellwisher' ? '/wellwisher/login' : '/login';
  const destinationPath = selectedRole === 'wellwisher' ? '/wellwisher' : '/';

  useEffect(() => {
    setSelectedRole(isWellwisherRoute ? 'wellwisher' : 'learner');
  }, [isWellwisherRoute]);

  const roleCopy = useMemo(() => {
    if (selectedRole === 'wellwisher') {
      return {
        title: 'Create Wellwisher Account',
        subtitle: 'Get a separate oversight dashboard for progress tracking, tasks, and focus control.',
      };
    }
    return {
      title: 'Create Account',
      subtitle: 'Join EducoLink and start learning smarter',
    };
  }, [selectedRole]);

  const validateForm = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!email.trim()) return 'Email is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (selectedRole === 'wellwisher') {
      const code = learnerCode.trim().toUpperCase();
      if (!code) return 'Learner code is required for wellwisher signup';
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return 'Learner code must be 8 valid characters';
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await requestJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: selectedRole,
          ...(selectedRole === 'wellwisher' && learnerCode.trim() ? { learnerCode: learnerCode.trim().toUpperCase() } : {}),
        })
      });

      login(data.user, data.token);
      navigate(destinationPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    if (selectedRole === 'wellwisher') {
      const code = learnerCode.trim().toUpperCase();
      if (!code) {
        setError('Learner code is required for wellwisher signup');
        return;
      }
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
        setError('Learner code must be 8 valid characters');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const { credential } = credentialResponse;
      if (!credential) {
        throw new Error('Google signup failed. Missing credential token.');
      }

      const data = await requestJson('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: credential,
          role: selectedRole,
          ...(selectedRole === 'wellwisher' && learnerCode.trim() ? { learnerCode: learnerCode.trim().toUpperCase() } : {}),
        })
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

      <motion.div className="login-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        {/* Left Section - Branding */}
        <div className="login-branding">
          <motion.div className="login-brand-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <img src="/Educolink%20logo.png" alt="EducoLink" className="login-logo-img" />
            <motion.img
              src="/login%20page%20.svg"
              alt="EducoLink register illustration"
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

        {/* Right Section - Register Form */}
        <div className="login-form-section">
          <motion.div className="login-form-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <div className="login-form-header">
              <h2>{roleCopy.title}</h2>
              <p>{roleCopy.subtitle}</p>
            </div>

            <div className="role-toggle" role="tablist" aria-label="Select account type">
              <button
                type="button"
                className={`role-toggle-btn ${selectedRole === 'learner' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('learner');
                  navigate('/register', { replace: true });
                }}
              >
                <IoPeopleOutline /> Learner
              </button>
              <button
                type="button"
                className={`role-toggle-btn ${selectedRole === 'wellwisher' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('wellwisher');
                  navigate('/wellwisher/register', { replace: true });
                }}
              >
                <IoShieldCheckmarkOutline /> Wellwisher
              </button>
            </div>

            {error && (
              <motion.div className="login-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="login-form">
              {/* Full Name Input */}
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <IoPersonOutline className="input-icon" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
              </div>

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
                <label htmlFor="password">Password</label>
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

              {/* Confirm Password Input */}
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <IoLockClosedOutline className="input-icon" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>

              {/* Learner Code input — only for wellwisher */}
              {selectedRole === 'wellwisher' && (
                <div className="form-group">
                  <label htmlFor="learnerCode">Learner Code <span style={{ fontWeight: 400, color: 'var(--on-surface-variant)', fontSize: '0.8em' }}>(required)</span></label>
                  <div className="input-wrapper">
                    <IoLinkOutline className="input-icon" />
                    <input
                      id="learnerCode"
                      type="text"
                      placeholder="e.g. AB3K7MNP"
                      maxLength={8}
                      value={learnerCode}
                      onChange={(e) => setLearnerCode(e.target.value.toUpperCase())}
                      className="login-input"
                      required={selectedRole === 'wellwisher'}
                      style={{ fontFamily: 'monospace', letterSpacing: '0.15em' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', margin: '0.15rem 0 0 0.25rem' }}>
                    Found on the learner&apos;s home page.
                  </p>
                </div>
              )}

              {/* Terms Checkbox */}
              <div className="form-group checkbox">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <Link to="/terms" style={{ color: '#574db3' }}>Terms of Service</Link>
                </label>
              </div>

              {/* Register Button */}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span>Or register with</span>
            </div>

            {/* Google Auth */}
            {hasGoogleClientId ? (
              <div className="google-login-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSignup}
                  onError={() => setError('Google signup failed. Please try again.')}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="signup_with"
                  width="100%"
                />
              </div>
            ) : (
              <div className="google-client-warning">
                Google sign-up is unavailable. Set VITE_GOOGLE_CLIENT_ID in your frontend environment.
              </div>
            )}

            {/* Sign In Link */}
            <div className="signup-link">
              Already have an account? <Link to={loginPath}>Sign in</Link>
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
