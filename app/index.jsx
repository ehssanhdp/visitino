import { Link } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

const Home = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visitino</Text>
      <Text style={styles.subtitle}>مدیریت مسیر و بازدیدها</Text>

      <Link href="/routing" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>برو به مسیریابی</Text>
        </TouchableOpacity>
      </Link>
      <Link href="/login" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>ورود</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/register" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>ثبت‌نام</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fdf9",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0c8c47",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#0c8c47",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
