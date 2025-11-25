import './Header.css'

function Header({ onSignOut }) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
          </svg>
          <span>Cash Tows EDDM Pro</span>
        </div>
      </div>
      <div className="header-right">
        <a href="#" className="nav-link">Trial Account</a>
        <button className="nav-button upgrade">Upgrade Now</button>
        {/* Sign Out button hidden until authentication is set up */}
        {/* <button className="nav-button signout" onClick={onSignOut}>Sign Out</button> */}
      </div>
    </header>
  )
}

export default Header

