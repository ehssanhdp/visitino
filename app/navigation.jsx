import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Linking, ScrollView, StyleSheet,Platform,StatusBar } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { base_url } from "@env";


export default function NavigationGuide() {
  const params = useLocalSearchParams();
  const { routeData } = params;
  const router = useRouter();
  const [points, setPoints] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visited, setVisited] = useState([]);

  useEffect(() => {
    if (routeData) {
      try {
        const parsed = JSON.parse(routeData);
        setPoints(parsed);
      } catch (e) {
        setPoints([]);
      }
    }
  }, [routeData]);

  if (!points || points.length === 0) {
    return (
      <View style={styles.centered}>
  <Text style={{textAlign: 'right', writingDirection: 'rtl'}}>مسیر یافت نشد.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0c8c47" />
          <Text style={styles.backBtnText}>بازگشت</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const current = points[currentIdx];
  const progress = Math.round((currentIdx / points.length) * 100);

  const handleOpenMap = () => {
    // Use userLocation from params as origin, current as destination
    let originLat = null, originLng = null;
    if (params.userLocation) {
      try {
        const userLoc = JSON.parse(params.userLocation);
        if (userLoc && typeof userLoc.lat === 'number' && typeof userLoc.lng === 'number') {
          originLat = userLoc.lat;
          originLng = userLoc.lng;
        } else {
          alert("موقعیت فعلی شما قابل دسترس نیست لطفا اجازه دسترسی به موقعیت مکانی را بدهید.");
          return;
        }
      } catch (e) {
        alert("موقعیت فعلی شما قابل دسترس نیست لطفا اجازه دسترسی به موقعیت مکانی را بدهید.");
        return;
      }
    } else {
      alert("موقعیت فعلی شما قابل دسترس نیست لطفا اجازه دسترسی به موقعیت مکانی را بدهید.");
      return;
    }
    const destinationLat = current.location[0];
    const destinationLng = current.location[1];

    const url = `https://nshn.ir?origin=${originLat},${originLng}&destination=${destinationLat},${destinationLng}&vehicle=d`;
    Linking.openURL(url);
  };

  const handleSkip = () => {
    if (currentIdx < points.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Last destination completed: move to completion view
      setCurrentIdx(points.length);
    }
  };

  const handleGoPrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleMarkVisited = async () => {
    try {
      let originLat = null, originLng = null;
      if (params.userLocation) {
        try {
          const userLoc = JSON.parse(params.userLocation);
          if (userLoc && typeof userLoc.lat === 'number' && typeof userLoc.lng === 'number') {
            originLat = userLoc.lat;
            originLng = userLoc.lng;
          } else {
            alert("موقعیت فعلی شما قابل دسترس نیست لطفا اجازه دسترسی به موقعیت مکانی را بدهید.");
          }
        } catch (e) {
          alert("موقعیت فعلی شما قابل دسترس نیست لطفا اجازه دسترسی به موقعیت مکانی را بدهید.");
        }
      }

      if (originLat !== null && originLng !== null) {
        const url = `${base_url}/mark-visited`;
        const payload = {
          userLocation: { lat: originLat, lng: originLng },

          visitedLocation: {
            lat: current?.location?.[0],
            lng: current?.location?.[1],
          }
        };

        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    } catch (_) {
      // no-op; we still proceed with local UI update
    }

    setVisited((prev) => [...prev, currentIdx]);
    if (currentIdx < points.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Last destination completed: move to completion view
      setCurrentIdx(points.length);
    }
  };

  const handleBackToRouting = () => {
    router.back();
  };

  // End of route
  if (currentIdx >= points.length) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="check-circle" size={48} color="#0c8c47" style={{ marginBottom: 12 }} />
  <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: 'right', writingDirection: 'rtl' }}>مسیر تکمیل شد!</Text>
  <Text style={{ color: "#0c8c47", marginBottom: 24, textAlign: 'right', writingDirection: 'rtl' }}>همه مقاصد با موفقیت بازدید شدند.</Text>
        <TouchableOpacity style={styles.backBtnGreen} onPress={handleBackToRouting}>
          <Text style={styles.backBtnTextGreen}>بازگشت</Text>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" style={{ marginRight: 6 }} />
        </TouchableOpacity>
      </View>
    );
  }

  // Next destinations
  const nextDestinations = points.slice(currentIdx + 1, currentIdx + 5);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToRouting} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          <Text style={styles.headerBtnText}>برگشت</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {textAlign: 'right', writingDirection: 'rtl'}]}>راهنمای مسیر</Text>
        <Text style={[styles.headerSubtitle, {textAlign: 'right', writingDirection: 'rtl'}]}>
          در حال هدایت به مقصد {currentIdx + 1} از {points.length}
        </Text>
      </View>

      {/* Current destination card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
    <Text style={[styles.cardTitle, {textAlign: 'right', writingDirection: 'rtl'}]}>مقصد فعلی</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currentIdx + 1} / {points.length}</Text>
          </View>
        </View>
  <Text style={[styles.storeName, {textAlign: 'center', writingDirection: 'rtl'}]}>{current.title || current.name}</Text>
        <View style={[styles.row, {justifyContent: 'flex-end'}]}>
          <Text style={[styles.storeAddress, {textAlign: 'right', writingDirection: 'rtl'}]}>{current.neighbourhood + "، " + current.address}</Text>
          <MaterialCommunityIcons name="map-marker" size={16} color="#0c8c47" style={{ marginLeft: 4 }} />
        </View>
        <View style={[styles.row, {justifyContent: 'flex-end'}]}>
          <Text style={[styles.meta, {textAlign: 'right', writingDirection: 'rtl'}]}>آخرین بازدید: {current.lastVisit || "-"}</Text>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#0c8c47" style={{ marginLeft: 4 }} />
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMap}>
            <MaterialCommunityIcons name="navigation" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, {textAlign: 'right', writingDirection: 'rtl'}]}>باز کردن مسیر</Text>
          </TouchableOpacity>
          {currentIdx > 0 && (
            <TouchableOpacity style={[styles.actionBtnOutline, { marginRight: 8 }]} onPress={handleGoPrevious}>
              <MaterialCommunityIcons name="undo" size={18} color="#0c8c47" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleSkip}>
            <MaterialCommunityIcons name="skip-next" size={18} color="#0c8c47" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.visitedBtn} onPress={handleMarkVisited}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#0c8c47" style={{ marginLeft: 4 }} />
          <Text style={[styles.visitedBtnText, {textAlign: 'right', writingDirection: 'rtl'}]}>علامت‌گذاری به عنوان بازدید شده</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={[styles.row, {justifyContent: 'flex-end'}]}>
    <Text style={[styles.progressTitle, {textAlign: 'right', writingDirection: 'rtl'}]}>پیشرفت مسیر</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Next destinations */}
      {nextDestinations.length > 0 && (
        <View style={styles.nextCard}>
          <Text style={[styles.nextTitle, {textAlign: 'right', writingDirection: 'rtl'}]}>مقاصد بعدی</Text>
              {nextDestinations.map((p, i) => (
                <View key={i} style={[styles.nextRow, {justifyContent: 'flex-end'}]}>
                  <Text style={[styles.nextName, {textAlign: 'right', writingDirection: 'rtl'}]}>
                    {currentIdx + i + 2}. {(p.store ? p.store.title : p.title) || (p.store ? p.store.name : p.name)}
                  </Text>
                </View>
              ))}
          {points.length > currentIdx + 5 && (
            <Text style={[styles.nextMore, {textAlign: 'right', writingDirection: 'rtl'}]}>و {points.length - currentIdx - 5} مقصد دیگر...</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1,backgroundColor: "#f8fdf9",padding: 16,paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 20) + 8 : 16},
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  backBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c8c47',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  backBtnTextGreen: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  header: { backgroundColor: "#0c8c47", borderRadius: 12, padding: 16, marginBottom: 16 },
  headerBtn: { flexDirection: "row", alignItems: "center" },
  headerBtnText: { color: "#fff", fontSize: 16, marginLeft: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  headerSubtitle: { color: "#fff", fontSize: 14 },
  card: { backgroundColor: "#e0f2f1", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: "#0c8c47" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#0c8c47" },
  badge: { backgroundColor: "#0c8c47", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  storeName: { fontSize: 18, fontWeight: "bold", marginBottom: 2, color: "#222" },
  storeAddress: { fontSize: 13, color: "#444" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  meta: { fontSize: 12, color: "#666" },
  actionRow: { flexDirection: "row", marginTop: 12, marginBottom: 8 },
  actionBtn: { flex: 1, backgroundColor: "#0c8c47", borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, marginRight: 8 },
  actionBtnText: { color: "#fff", fontWeight: "bold", marginLeft: 4 },
  actionBtnOutline: { width: 48, height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#0c8c47", alignItems: "center", justifyContent: "center" },
  visitedBtn: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#0c8c47", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10 },
  visitedBtnText: { color: "#0c8c47", fontWeight: "bold" },
  progressCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#0c8c47" },
  progressTitle: { fontSize: 15, fontWeight: "bold", color: "#0c8c47", marginLeft: 4 },
  progressBarBg: { height: 8, backgroundColor: "#e0f2f1", borderRadius: 4, marginVertical: 8, overflow: "hidden" },
  progressBar: { height: 8, backgroundColor: "#0c8c47", borderRadius: 4 },
  nextCard: { backgroundColor: "#f8fdf9", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#0c8c47" },
  nextTitle: { fontSize: 15, fontWeight: "bold", color: "#0c8c47", marginBottom: 8 },
  nextRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  nextName: { fontSize: 14, fontWeight: "bold", color: "#222", marginRight: 4 },
  nextMore: { textAlign: "center", color: "#888", fontSize: 12, marginTop: 4 }
});
