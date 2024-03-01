// import { useState } from 'react'
import React, { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Widget, { component, configuration, journey } from '@forgerock/login-widget';
import '@forgerock/login-widget/widget.css';

function App() {
  const [successUrl, setSuccessUrl] = useState('');
  const [user, setUser] = useState();

  // Initiate all the Widget modules
  const config = configuration();
  const componentEvents = component();
  const journeyEvents = journey();

  useEffect(() => {

    config.set({
      forgerock: {
        serverConfig: {
          baseUrl: 'https://openam-lm-poc.forgeblocks.com/am/',
          timeout: 3000,
        },
        // Optional but recommended configuration:
        realmPath: 'alpha',
        clientId: 'sdkPublicClient',
        redirectUri: window.location.href,
        scope: 'openid profile email address phone'
      },
      style: {
        logo: {
          dark: 'https://purepng.com/public/uploads/large/purepng.com-liberty-mutual-insurance-logologobrand-logoiconslogos-2515199396954pqyu.png',
          light: 'https://purepng.com/public/uploads/large/purepng.com-liberty-mutual-insurance-logologobrand-logoiconslogos-2515199396954pqyu.png',
          height: 200,
          width: 200,
        },
        sections: {
          header: true,
        }
      },
    });

    const widget = new Widget({ target: document.getElementById('widget-root') });

    const journeyEventsUnsub = journeyEvents.subscribe((event) => {
      console.log(event);

      // Test for success event of journey
      if (event.journey.successful) {
        // Grab the successUrl from journey response
        setSuccessUrl(event.journey.response.successUrl);
      }
      // Test for success event of user
      if (event.user.successful) {
        // Save user information, if desired
        setUser(event.user.response);

        // After getting the user data, redirect to successUrl
        componentEvents.close();

        // Use `location.replace` if you don't want the current URL in history
        // Use `location.assign` if you want to keep this current URL in history
        location.assign(successUrl);
      }
    });

    const url = new URL(location.href);
    const suspendedId = url.searchParams.get('suspendedId');
  
    if (suspendedId) {
      journeyEvents.start({ resumeUrl: location.href });
      componentEvents.open();
    }
  
    return () => {
      widget.$destroy();
      journeyEventsUnsub();
    };
  }, []);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() => {
            journeyEvents.start({
              journey: 'LMRegistration'
            });
            componentEvents.open();
          }}>
          Register
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
