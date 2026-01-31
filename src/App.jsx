import './App.css'

function App() {
  return (
    <>
      <div className="sparkle"></div>
      
      <div className="container">
        <div className="art-deco-border">
          <div className="corner-ornament top-left"></div>
          <div className="corner-ornament top-right"></div>
          <div className="corner-ornament bottom-left"></div>
          <div className="corner-ornament bottom-right"></div>

          <header className="header">
            <div className="year">2026</div>
            <h1 className="main-title">ODUCADO<br/>FAMILY REUNION</h1>
            <div className="subtitle">AN EVENING OF ELEGANCE</div>
          </header>

          <div className="divider"></div>

          <p className="intro-text">
            You are cordially invited to a magnificent celebration honoring our roots, our shared history, 
            and the legacy of the Oducado name. Hosted with love by the children of Primo and Aida Oducado, 
            this long-awaited reunion brings us together — a chance to reconnect, reminisce, 
            and create beautiful new memories.
          </p>

          <div className="rsvp-button-container">
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLSdnVTe5dJ8gC_BioQauFma4eMLm4RYuMbr31sjge44Eojy-ow/viewform?fbzx=-8414519069041158699" 
              target="_blank" 
              rel="noopener noreferrer"
              className="rsvp-button rsvp-button-small"
            >
              <span className="rsvp-text">RSVP</span>
            </a>
          </div>

          <div className="divider"></div>

          <section className="section">
            <h2 className="section-title">Event Details</h2>
            
            <div className="details-grid">
              <div className="detail-card">
                <div className="detail-icon">📅</div>
                <div className="detail-label">DATE</div>
                <div className="detail-content">
                  Saturday<br/>
                  July 4, 2026
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-icon">🕔</div>
                <div className="detail-label">TIME</div>
                <div className="detail-content">
                  Cocktail Reception<br/>
                  5:00 PM<br/><br/>
                  Dinner Service<br/>
                  6:00 PM<br/><br/>
                  Festivities to Follow
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-icon">📍</div>
                <div className="detail-label">LOCATION</div>
                <div className="detail-content">
                  Ajax Convention Centre<br/>
                  Bayly Room<br/>
                  550 Beck Crescent<br/>
                  Ajax, Ontario<br/>
                  L1Z 1C9
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2 className="section-title">Reunion Fee</h2>
            
            <div className="pricing-section">
              <div className="pricing-grid">
                <div className="price-item">
                  <div className="price-label">Adults</div>
                  <div className="price-amount">$120</div>
                  <div className="price-description">
                    3-course dinner • Wine • Pop & juice
                  </div>
                </div>

                <div className="price-item">
                  <div className="price-label">Children (12 & Under)</div>
                  <div className="price-amount">$35</div>
                  <div className="price-description">
                    Child-friendly meal • Pop & juice
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          <section className="section">
            <div className="registration-box">
              <h2 className="registration-title">How to Register</h2>
              
              <div className="rsvp-button-container">
                <a 
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdnVTe5dJ8gC_BioQauFma4eMLm4RYuMbr31sjge44Eojy-ow/viewform?fbzx=-8414519069041158699" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rsvp-button"
                >
                  <span className="rsvp-text">RSVP</span>
                  <span className="rsvp-subtext">Complete Registration Form</span>
                </a>
              </div>

              <div className="divider" style={{ margin: '40px auto' }}></div>
              
              <p className="detail-content" style={{ textAlign: 'center', marginBottom: '30px' }}>
               If you are unable to fill the form, please send the following information along with payment to:
              </p>

              <div className="contact-info">
                <strong>Anelie Oducado</strong><br/>
                <a href="mailto:Anelie88@yahoo.com" className="email">Anelie88@yahoo.com</a>
              </div>

              <ul className="registration-list">
                <li>Full name(s) of adult attendee(s)</li>
                <li>Full name(s) of child attendee(s) (if applicable), including ages</li>
                <li>Contact number or email</li>
                <li>Will you require accommodation? (Yes / No)</li>
                <li>Any dietary restrictions or allergies</li>
              </ul>

              <div className="deadline">
                Registration Deadline: May 1, 2026
              </div>
            </div>
          </section>

          <div className="divider"></div>

          <section className="section">
            <h2 className="section-title">Accommodations</h2>
            
            <div className="hotels-list">
              <p className="detail-content" style={{ textAlign: 'center', marginBottom: '20px' }}>
                We are currently working on securing a special group room rate at a hotel 
                near the Ajax Convention Centre. Once confirmed, booking details and discount codes 
                will be shared with registered guests.
              </p>

              <p className="detail-content" style={{ textAlign: 'center', margin: '30px 0 20px', fontWeight: 600, color: '#d4af37' }}>
                Nearby Hotels Include:
              </p>

              <ul>
                <li>
                  <a 
                    href="https://www.hilton.com/en/hotels/yyzajgi-hilton-garden-inn-toronto-ajax/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hotel-link"
                  >
                    Hilton Garden Inn Toronto/Ajax
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.hilton.com/en/hotels/ytoajhw-homewood-suites-ajax-ontario-canada/?SEO_id=GMB-AMER-HG-YTOAJHW&y_source=1_MjA4NDYyNi03MTUtbG9jYXRpb24ud2Vic2l0ZQ%3D%3D" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hotel-link"
                  >
                    Homewood Suites by Hilton Ajax
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.wyndhamhotels.com/super-8/ajax-ontario/super-8-ajax-toronto-on/overview?CID=LC:yytq4fvvehxh7se:13920&iata=00093796" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hotel-link"
                  >
                    Super 8 by Wyndham Ajax/Toronto
                  </a>
                </li>
              </ul>
            </div>
          </section>

          <div className="divider"></div>

          <footer className="footer">
            <p className="closing-message">
              We truly hope you can join us!<br/>
              Let&apos;s honor the generations before us, celebrate our family today,<br/>
              and welcome the future with love, laughter, and togetherness.
            </p>

            <div className="divider"></div>

            <p className="signature">
              Warmly,<br/><br/>
              PRIMO AND AIDA ODUCADO&apos;S CHILDREN
            </p>

            <div className="divider"></div>

            <div className="rsvp-button-container">
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSdnVTe5dJ8gC_BioQauFma4eMLm4RYuMbr31sjge44Eojy-ow/viewform?fbzx=-8414519069041158699" 
                target="_blank" 
                rel="noopener noreferrer"
                className="rsvp-button"
              >
                <span className="rsvp-text">RSVP</span>
                <span className="rsvp-subtext">Complete Registration Form</span>
              </a>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

export default App
