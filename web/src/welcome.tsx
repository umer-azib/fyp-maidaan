import { Link } from 'react-router';
import { accountEntries, welcomeSubtitle } from '../../shared/demo-auth';
import { Icon } from './ui';

export function Welcome() {
  return <div className="welcome-page role-welcome">
    <div className="welcome-photo"><img src="/community-football.png" alt="Friends enjoying football together"/><Link to="/welcome" className="brand">maidaan.</Link></div>
    <section><h1>Your <em>people.</em><br/>Your game.<br/>Your <em>Maidaan.</em></h1>
      <p className="muted welcome-subtitle">{welcomeSubtitle}</p>
      <div className="role-choices">{accountEntries.map(entry=><Link key={entry.role} to={'/'+entry.role+'/login'} className={'role-choice '+(entry.role==='player'?'primary':'')}>
        <Icon name={entry.icon}/><span><strong>{entry.title}</strong><small>{entry.subtitle}</small></span><Icon name="arrow"/>
      </Link>)}</div>
    </section>
  </div>;
}
