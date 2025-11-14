import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard,TouchableWithoutFeedback, ScrollView } from "react-native";
import { Ionicons }  from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { base_url } from "@env";


const Register = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);

  const validatePassword = (text) => {
    setPassword(text);
    const isValid =
      text.length >= 8 &&
      /[A-Za-z]/.test(text) &&
      /\d/.test(text);
    setPasswordValid(isValid);
  };

  const handleRegister = async () => {
    setError(""); // reset error

    if (!firstName || !lastName || !phoneNumber || !password || !confirmPassword) {
      setError("لطفاً همه فیلدها را پر کنید");
      return;
    }

    const normalizedPhone = (phoneNumber || "").replace(/\s+/g, "");
    const iranPhoneRegex = /^((0?9)|(\+?989))\d{9}$/;
    if (!iranPhoneRegex.test(normalizedPhone)) {
      setError("فرمت شماره تلفن نامعتبر است");
      return;
    }

    if (!passwordValid) {
      setError("رمز عبور شرایط لازم را ندارد");
      return;
    }

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      return;
    }

    try {
      const res = await fetch(base_url + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone,
          password: password,
        }),
      });

      if (res.ok) {
        router.replace("/login");
      } else {
        const msg = await res.text();
        setError(msg || "ثبت‌نام ناموفق بود");
      }
    } catch (error) {
      console.error(error);
      setError("ارتباط با سرور برقرار نشد");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>ثبت‌نام</Text>

        {/* First Name */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="نام"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="نام خانوادگی"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="شماره تلفن"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/[^\d]/g, "");
              setPhoneNumber(digitsOnly);
            }}
          />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="رمز عبور"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={validatePassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <Text style={passwordValid ? styles.valid : styles.invalid}>
            رمز عبور باید حداقل ۸ کاراکتر باشد و شامل یک حرف و یک عدد باشد
          </Text>
        )}

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#555" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="تکرار رمز عبور"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>ثبت‌نام</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={styles.linkText}>قبلاً ثبت‌نام کرده‌اید؟ وارد شوید</Text>
        </TouchableOpacity>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    marginTop: 90,
  },
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
    marginTop: 15,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  linkText: { color: "#0c8c47", marginTop: 15, textDecorationLine: "underline" },
  error: { color: "red", marginBottom: 10, alignSelf: "flex-end", marginRight: "10%" },
  valid: { color: "green", marginBottom: 10, alignSelf: "flex-end", marginLeft: "10%", marginRight: "10%"  ,direction: "rtl" },
  invalid: { color: "red", marginBottom: 10, alignSelf: "flex-end", marginLeft: "10%", marginRight: "10%",direction: "rtl" },
});
