import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { getToken, saveToken, deleteToken } from "../utils/storage";
import {jwtDecode} from "jwt-decode";
import { base_url } from "@env";

function isExpired(token) {
  try {
    const decoded = jwtDecode(token);

    if (decoded.exp) {
      const expireDate = new Date(decoded.exp * 1000);
      console.log("🔐 Token expires at:", expireDate.toLocaleString());
    } else {
      console.log("⚠️ Token has no exp claim");
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (err) {
    console.log("❌ Failed to decode token:", err);
    return true;
  }
}

export default function Layout() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const access = await getToken("accessToken");
        const refresh = await getToken("refreshToken");
        console.log(access)
        console.log(refresh)

        if (!access) {
          console.log("No access token found");
          setLoggedIn(false);
          setLoading(false);
          return;
        }

        if (!isExpired(access)) {
          console.log("✅ Access token valid");
          setLoggedIn(true);
          setLoading(false);
          return;
        }

        // Access token expired, try refresh
        console.log(refresh);
        console.log(!isExpired(refresh));
        if (refresh && !isExpired(refresh)) {
          console.log("🔄 Refreshing token...");
          const res = await fetch(base_url + "/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json",
              "Authorization": `Bearer ${access}`
             },
            body: JSON.stringify({ refresh_token: refresh }),
          });

          if (res.ok) {
            const data = await res.json();
            await saveToken("accessToken", data.access_token);
            await saveToken("refreshToken", data.refresh_token);
            console.log("✅ Token refreshed");
            setLoggedIn(true);
          } else {
            throw new Error(`Refresh failed: ${res.status}`);
          }
        } else {
          throw new Error("Refresh token invalid or expired");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        await deleteToken("accessToken");
        await deleteToken("refreshToken");
        setLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0c8c47" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!loggedIn ? (
        <Stack.Screen name="login" />
      ) : (
        // Add your protected screens here
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="other-protected-screens" />
        </>
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fdf9",
  },
});