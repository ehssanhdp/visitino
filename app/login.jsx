import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { saveToken } from "../utils/storage";
import { Ionicons } from "@expo/vector-icons"; // icons
import { base_url } from "@env";


const Login = () => {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // new state for errors

  const handleLogin = async () => {
    const normalizedPhone = (phone || "").replace(/\s+/g, "");
    const iranPhoneRegex = /^((0?9)|(\+?989))\d{9}$/;
    if (!iranPhoneRegex.test(normalizedPhone)) {
      setError("فرمت شماره تلفن نامعتبر است");
      return;
    }
    try {
      console.log("1111")
      setError(""); // reset error before trying login
      const res = await fetch(base_url + "/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          password: password,
        }),
      });
      
      if (!res.ok) {
        setError("شماره تلفن یا رمز عبور اشتباه است");
        throw new Error("Login failed: " + res.status);
      }

      const response = await res.json();

      await saveToken("accessToken", response.access_token);
      await saveToken("refreshToken", response.refresh_token);

      console.log("Tokens saved!");
      router.replace("/"); // go to home
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>ورود</Text>

        {/* Phone input */}
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="شماره تلفن"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/[^\d]/g, "");
              setPhone(digitsOnly);
            }}
          />
        </View>

        {/* Password input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="رمز عبور"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>ورود</Text>
        </TouchableOpacity>

        {/* Registration link */}
        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.linkText}>حساب کاربری ندارید؟ ثبت نام کنید</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center", padding: 20, marginTop: 90 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    width: "80%",
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 10 },
  button: {
    backgroundColor: "#0c8c47",
    padding: 12,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  error: { color: "red", marginBottom: 10, alignSelf: "flex-end", marginRight: "10%" },
  linkText: { color: "#0c8c47", marginTop: 15, textDecorationLine: "underline" },
});
