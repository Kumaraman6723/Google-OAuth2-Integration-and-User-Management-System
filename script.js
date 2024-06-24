// Function to initiate Google Sign-In
function signIn() {
  let oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";
  let form = document.createElement("form");
  form.setAttribute("method", "GET");
  form.setAttribute("action", oauth2Endpoint);

  let params = {
    client_id: "apps.googleusercontent.com",
    redirect_uri: "http://127.0.0.1:5501/profile.html",
    response_type: "token",
    scope:
      "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.gender.read",
    include_granted_scopes: "true",
    state: "pass-through-value",
  };

  for (let p in params) {
    let input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", p);
    input.setAttribute("value", params[p]);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

// Function to parse URL parameters
function getParams() {
  const params = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.substring(1));
  let paramObj = {};

  for (let [key, value] of params.entries()) {
    paramObj[key] = value;
  }

  for (let [key, value] of fragment.entries()) {
    paramObj[key] = value;
  }

  return paramObj;
}

// Function to store authentication information in localStorage
function storeAuthInfo(params) {
  if (Object.keys(params).length > 0) {
    localStorage.setItem("authinfo", JSON.stringify(params));
    console.log("Auth info stored:", params);
  } else {
    console.log("No URL parameters to store.");
  }
}

// Function to load authentication information from localStorage
function loadAuthInfo() {
  const info = JSON.parse(localStorage.getItem("authinfo"));
  if (!info) {
    console.error("No auth information found in localStorage.");
    return null;
  }
  console.log("Auth info loaded:", info);
  return info;
}

// Function to send authentication information to the server
function sendAuthInfoToServer(authInfo) {
  fetch("http://localhost:3001/checkUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: authInfo.email }), // Use email or another unique identifier
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.exists) {
        console.log("User exists in database, fetching stored data...");
        displayUserInfo(data.userInfo); // Display stored user info
      } else {
        console.log("User does not exist, storing new user data...");
        fetch("http://localhost:3001/storeAuthInfo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(authInfo),
        })
          .then((response) => response.text())
          .then((data) => {
            console.log("Server response:", data);
            displayUserInfo(authInfo); // Display new user info
          })
          .catch((error) => {
            console.error("Error sending auth info to server:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error checking user in database:", error);
    });
}

// Function to fetch user info from Google API
function fetchUserInfo(token) {
  fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((userInfo) => {
      console.log("User info fetched:", userInfo);
      fetchAdditionalUserInfo(token, userInfo);
    })
    .catch((error) => {
      console.error("Error fetching user info:", error);
    });
}

// Function to fetch additional user info (gender, birthday) from Google API
function fetchAdditionalUserInfo(token, userInfo) {
  fetch(
    `https://people.googleapis.com/v1/people/me?personFields=genders,birthdays`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log("Additional user info fetched:", data);
      const gender =
        data.genders && data.genders.length > 0 ? data.genders[0].value : "N/A";
      const birthday =
        data.birthdays && data.birthdays.length > 0
          ? `${data.birthdays[0].date.year}-${data.birthdays[0].date.month}-${data.birthdays[0].date.day}`
          : "N/A";

      const completeUserInfo = {
        ...userInfo,
        gender,
        birthday,
        password: "YourDefaultPassword", // Replace with actual password logic
      };

      sendAuthInfoToServer(completeUserInfo);

      displayUserInfo(completeUserInfo);
    })
    .catch((error) => {
      console.error("Error fetching additional user info:", error);
    });
}

// Function to initialize Google Auth
function initGoogleAuth() {
  gapi.load("auth2", function () {
    gapi.auth2
      .init({
        client_id:
          "174612712651-5rq4a1uco3ftc60t49jvvvpj4l8ikg5m.apps.googleusercontent.com", // Replace with your client ID
      })
      .then(function () {
        console.log("Google Auth initialized.");
      });
  });
}

// Function to sign out user and revoke token
function signOut() {
  const authInfo = loadAuthInfo();
  if (!authInfo) {
    console.error("No auth information found.");
    return;
  }
  const token = authInfo.access_token;

  // Revoke the token
  fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
    method: "POST",
    headers: {
      "Content-type": "application/x-www-form-urlencoded",
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log("Token revoked.");
        // Sign out from Google and remove auth info from localStorage
        const auth2 = gapi.auth2.getAuthInstance();
        auth2
          .signOut()
          .then(function () {
            console.log("User signed out.");
            localStorage.removeItem("authinfo");
            window.location.href = "http://127.0.0.1:5501/signup.html"; // Redirect to login page
          })
          .catch((error) => {
            console.error("Error signing out:", error);
            // Redirect to login page in case of an error during sign-out
            window.location.href = "http://127.0.0.1:5501/signup.html";
          });
      } else {
        console.error("Error revoking token:", response.statusText);
        // Redirect to login page even if token revocation fails
        window.location.href = "http://127.0.0.1:5501/signup.html";
      }
    })
    .catch((error) => {
      console.error("Error revoking token:", error);
      // Redirect to login page in case of an error during token revocation
      window.location.href = "http://127.0.0.1:5501/signup.html";
    });
}

// Function to update user profile
// Function to update user profile
function updateProfile() {
  const authInfo = loadAuthInfo();
  if (!authInfo) {
    console.error("No auth information found.");
    return;
  }

  // Fetching profile ID from DOM
  const profileId = document.getElementById("id").value;

  // Formatting birthday to YYYY-MM-DD format
  const birthday = formatDateForMySQL(
    document.getElementById("birthday").value
  );

  const updatedProfile = {
    id: profileId,
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    gender: document.getElementById("gender").value,
    birthday: birthday,
    password: "YourUpdatedPassword", // Replace with actual password logic
  };

  fetch("http://localhost:3001/updateProfile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedProfile),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log("Server response:", data);
      // Optionally update UI or show success message
    })
    .catch((error) => {
      console.error("Error updating profile:", error);
    });
}

// Function to format date for MySQL (YYYY-MM-DD)
function formatDateForMySQL(dateString) {
  if (!dateString || dateString === "N/A") {
    return "2000-01-01"; // Default date if not provided
  }

  const dateObj = new Date(dateString);
  const year = dateObj.getUTCFullYear();
  const month = ("0" + (dateObj.getUTCMonth() + 1)).slice(-2); // Months are zero based
  const day = ("0" + dateObj.getUTCDate()).slice(-2);

  return `${year}-${month}-${day}`;
}

// Initialize Google Auth on window load
window.onload = function () {
  initGoogleAuth();

  const params = getParams();
  console.log("URL parameters:", params);
  storeAuthInfo(params);
  window.history.pushState({}, document.title, "/profile.html");

  const authInfo = loadAuthInfo();
  if (authInfo) {
    console.log("Access token:", authInfo["access_token"]);
    console.log("Expires in:", authInfo["expires_in"]);
    fetchUserInfo(authInfo["access_token"]);
  }

  // Optional: Attach event listeners for updating profile
  const updateProfileBtn = document.getElementById("updateProfileBtn");
  if (updateProfileBtn) {
    updateProfileBtn.addEventListener("click", updateProfile);
  }
};
