import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export default function SessionWarning() {
  const { sessionError } = useContext(AuthContext);

  if (!sessionError) return null;

  return <div className="server-warning">{sessionError}</div>;
}
