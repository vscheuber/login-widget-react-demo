// import { useState } from 'react'
import React, { useEffect, useState, useRef } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Widget, {
  component,
  configuration,
  journey,
  user,
} from "@forgerock/login-widget";
import "@forgerock/login-widget/widget.css";

function App() {
  const [successUrl, setSuccessUrl] = useState("");
  const [userProfile, setUserProfile] = useState();

  // Use refs to store API instances
  const journeyEventsRef = useRef(null);
  const componentEventsRef = useRef(null);
  const userRef = useRef(null);
  const isLoggingOut = useRef(false);

  // Debug: Log when user state changes
  useEffect(() => {
    console.log("User state changed to:", userProfile);
  }, [userProfile]);

  useEffect(() => {
    // Initiate all the Widget modules inside useEffect
    const config = configuration();
    const componentEvents = component();
    const journeyEvents = journey();
    const userApi = user;

    // Store refs for use in onClick handlers
    journeyEventsRef.current = journeyEvents;
    componentEventsRef.current = componentEvents;
    userRef.current = userApi;

    async function init() {
      config.set({
        forgerock: {
          serverConfig: {
            baseUrl: "https://openam-volker-dev.forgeblocks.com/am/",
            timeout: 3000,
          },
          // Optional but recommended configuration:
          realmPath: "alpha",
          clientId: "sdkPublicClient",
          // redirectUri: "http://localhost:5173",
          redirectUri: "https://login.scheuber.io:5173",
          scope: "openid profile email address",
        },
        links: {
          termsAndConditions:
            "https://www.pingidentity.com/en/legal/pingid-terms-of-service.html",
        },
        style: {
          logo: {
            dark: "https://www.applivery.com/wp-content/uploads/2024/11/pingidentity-partner-veridas-1024x380-1.png",
            light:
              "https://www.applivery.com/wp-content/uploads/2024/11/pingidentity-partner-veridas-1024x380-1.png",
            height: 200,
            width: 200,
          },
          sections: {
            header: true,
          },
        },
      });

      const widget = new Widget({
        target: document.getElementById("widget-root"),
      });

      const journeyEventsUnsub = journeyEvents.subscribe((event) => {
        console.log("===== Journey event received =====");
        console.log("event.journey.successful:", event.journey?.successful);
        console.log("event.oauth.successful:", event.oauth?.successful);
        console.log("event.user.successful:", event.user?.successful);
        console.log("event.component.open:", event.component?.open);
        console.log("Full event object:", event);
        console.log("==================================");

        // Test for success event of journey
        if (event.journey.successful) {
          console.log("Journey successful, response:", event.journey.response);
          // Grab the successUrl from journey response
          setSuccessUrl(event.journey.response.successUrl);
        }

        // Test for oauth success
        if (event.oauth?.successful) {
          console.log("OAuth successful, tokens received");
        }

        // Test for success event of user
        if (event.user?.successful && !isLoggingOut.current) {
          console.log("User authentication successful!");
          console.log("User data received:", event.user.response);
          console.log(
            "About to call setUserProfile with:",
            event.user.response,
          );
          // Save user information, if desired
          setUserProfile(event.user.response);
          console.log("setUserProfile called");

          // After getting the user data, close the modal
          componentEvents.close();

          // Comment out redirect to display user info instead
          // location.assign(successUrl);
        }

        // Check if user info might be in a different state
        if (event.user?.completed && event.user?.response) {
          console.log(
            "User completed but not successful, response:",
            event.user.response,
          );
        }
      });

      const url = new URL(location.href);
      // const suspendedId = url.searchParams.get('suspendedId');
      const codeParam = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");

      if (codeParam && stateParam) {
        console.log(
          `Attempting to resume journey with params: ${location.href}`,
        );
        await journeyEvents.start({
          journey: "Passkey",
          resumeUrl: location.origin,
          forgerock: {
            query: {
              code: codeParam,
              state: stateParam,
            },
          },
        });
        componentEvents.open();
      }

      return () => {
        widget.$destroy();
        journeyEventsUnsub();
      };
    }
    init();
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
        {!userProfile && (
          <button
            onClick={() => {
              console.log("Login button clicked");
              console.log(
                "journeyEventsRef.current:",
                journeyEventsRef.current,
              );
              console.log(
                "componentEventsRef.current:",
                componentEventsRef.current,
              );
              if (journeyEventsRef.current && componentEventsRef.current) {
                console.log("Starting journey...");
                journeyEventsRef.current.start({
                  journey: "Passkey",
                });
                console.log("Opening modal...");
                componentEventsRef.current.open();
              } else {
                console.error("Journey or component APIs not available");
              }
            }}
          >
            Login
          </button>
        )}
        {userProfile && (
          <div className="user-info">
            <button
              onClick={async () => {
                console.log("Logout button clicked");
                isLoggingOut.current = true;
                if (userRef.current) {
                  console.log("Calling user.logout()...");
                  await userRef.current.logout();
                  console.log("user.logout() completed, clearing local state");

                  // Clear React state
                  setUserProfile(null);
                  setSuccessUrl("");

                  // Clear browser storage to remove cached credentials
                  console.log("Clearing localStorage and sessionStorage...");
                  localStorage.clear();
                  sessionStorage.clear();

                  console.log("State cleared, ready for next login");
                }
                isLoggingOut.current = false;
              }}
              style={{ marginBottom: "1rem" }}
            >
              Logout
            </button>
            <h2>Logged In User</h2>
            <div style={{ textAlign: "left", display: "inline-block" }}>
              <p>
                <strong>Name:</strong> {userProfile.name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {userProfile.email || "N/A"}
              </p>
              <p>
                <strong>Username:</strong>{" "}
                {userProfile.preferred_username || "N/A"}
              </p>
              <p>
                <strong>Subject:</strong> {userProfile.sub || "N/A"}
              </p>
            </div>
          </div>
        )}
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div id="widget-root"></div>
    </>
  );
}

export default App;
