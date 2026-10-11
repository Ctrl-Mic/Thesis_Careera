function getAuthToken() {
  const token = window.localStorage.getItem("careerera_auth_token");
  if (!token) {
    throw new Error("Your sign-in session expired. Please sign in again.");
  }
  return token;
}

async function postVerification(endpoint, image) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ image }),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true) {
    throw new Error(result.message || "Unable to complete verification.");
  }
  return result;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read the selected ID image."));
        return;
      }
      resolve(reader.result);
    });
    reader.addEventListener("error", () => {
      reject(new Error("Unable to read the selected ID image."));
    });
    reader.readAsDataURL(file);
  });
}

export async function verifyStudentId(file) {
  const image = await readImageFile(file);
  return postVerification("/api/verification/student-id", image);
}

export function verifyStudentFace(image) {
  return postVerification("/api/verification/face", image);
}