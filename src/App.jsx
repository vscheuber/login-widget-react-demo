import { useEffect, useState, useRef } from "react";
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
import widgetConfig from "./widget.config.json";

function App() {
  const [, setSuccessUrl] = useState("");
  const [userProfile, setUserProfile] = useState();
  const [tokenIssuer, setTokenIssuer] = useState("");
  const [profiles] = useState(widgetConfig.profiles);
  const [selectedProfile, setSelectedProfile] = useState(
    widgetConfig.profiles.find((p) => p.name === widgetConfig.defaultProfile) ||
      widgetConfig.profiles[0],
  );

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
            baseUrl: selectedProfile.baseUrl,
            timeout: 3000,
          },
          // Optional but recommended configuration:
          realmPath: "alpha",
          clientId: selectedProfile.clientId,
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
        if (event.oauth?.successful && event.oauth?.response?.idToken) {
          console.log("OAuth successful, tokens received");
          try {
            // Decode ID token to get issuer
            const idToken = event.oauth.response.idToken;
            const payload = idToken.split(".")[1];
            const decodedPayload = JSON.parse(
              atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
            );
            console.log("Decoded ID token payload:", decodedPayload);
            if (decodedPayload.iss) {
              setTokenIssuer(decodedPayload.iss);
            }
          } catch (error) {
            console.error("Failed to decode ID token:", error);
          }
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
          journey: selectedProfile.journey,
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
  }, [selectedProfile]);

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

      {/* Profile Selector */}
      <div className="profile-selector" style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="profile-select" style={{ marginRight: "0.5rem" }}>
          <strong>Connection Profile:</strong>
        </label>
        <select
          id="profile-select"
          value={selectedProfile.name}
          onChange={(e) => {
            const profile = profiles.find((p) => p.name === e.target.value);
            if (profile) {
              console.log("Switching to profile:", profile.name);
              setSelectedProfile(profile);
              // Clear user state when switching profiles
              setUserProfile(null);
              setTokenIssuer("");
            }
          }}
          disabled={!!userProfile}
          style={{ padding: "0.5rem", fontSize: "1rem" }}
        >
          {profiles.map((profile) => (
            <option key={profile.name} value={profile.name}>
              {profile.name}
            </option>
          ))}
        </select>
        {userProfile && (
          <span
            style={{ marginLeft: "0.5rem", fontSize: "0.9rem", color: "#888" }}
          >
            (logout to switch profiles)
          </span>
        )}
      </div>

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
                  journey: selectedProfile.journey,
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
                  setTokenIssuer("");

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
              <p>
                <strong>Issuer:</strong> {tokenIssuer || "N/A"}
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
