import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  FlatList,
  BackHandler,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import * as Location from "expo-location";
import { base_url } from "@env";

export default function Routing() {
  // Unique key for items in results to avoid name collisions
  const getItemKey = useCallback((item) => {
    if (!item) return '';
    if (item.id) return String(item.id);
    const title = item.name || item.title || '';
    const lx = (item.location && (item.location.x ?? item.location[0])) ?? '';
    const ly = (item.location && (item.location.y ?? item.location[1])) ?? '';
    return `${title}-${lx}-${ly}`;
  }, []);
const ShopCard = React.memo(function ShopCard({
  item,
  index,
  isSelected,
  showOrder,
  displayIndex,
  onPress,
  disabled,
  styles
}) {
  // Support both search and optimized route (TSPPoint with .store)
  const data = item.store ? item.store : item;
  const itemTitle = data.name || data.title;
  const neighbourhood = data.neighbourhood || data.neighborhood || data.neighbour || "";
  const type = data.type || "";
  let iconName = "store";

  return (
    <TouchableOpacity
      style={[
        styles.shopCard,
        isSelected && {
          backgroundColor: "#e0f2f1",
          borderColor: "#0c8c47",
          borderWidth: 2,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.shopHeader}>
        {showOrder && (
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>{displayIndex}</Text>
          </View>
        )}
        {/* Icon and title row */}
        <View style={styles.shopTitleWrapper}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={styles.shopTitle}>
              {"\u202B"}
              {itemTitle}
              {"\u202C"}
            </Text>
            {isSelected && (
              <MaterialCommunityIcons name="check-circle" size={18} color="#0c8c47" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
      </View>
      {/* Extra info: type, neighbourhood, region */}
      {(type || neighbourhood) && (
        <View style={{ flexDirection: "column", alignItems: "flex-end" }}>
          {type ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={styles.resultMetaData}>{type}</Text>
              <MaterialCommunityIcons name={iconName} size={15} color="#0c8c47" style={{ marginLeft: 4 }} />
            </View>
          ) : null}
          {neighbourhood ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={styles.resultMetaData}>{neighbourhood}</Text>
              <MaterialCommunityIcons name="home-city" size={15} color="#0c8c47" style={{ marginLeft: 4 }} />
            </View>
          ) : null}
        </View>
      )}
      {data.address && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Text style={styles.resultMetaData}>{data.address}</Text>
          <MaterialCommunityIcons name="map-marker" size={15} color="#0c8c47" style={{ marginLeft: 4 }} />
        </View>
      )}
      {/* Duration and Distance row */}
      {(data.durationText || data.distanceText) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
          {data.durationText && (
            <>
              <Text style={styles.resultMetaData}>{data.durationText}</Text>
              <MaterialCommunityIcons name="clock-fast" size={15} color="#0c8c47" style={{ marginLeft: 4, marginRight: 4 }} />
            </>
          )}
          {data.distanceText && (
            <>
              <Text style={styles.resultMetaData}>{data.distanceText}</Text>
              <MaterialCommunityIcons name="map-marker-distance" size={15} color="#0c8c47" style={{ marginLeft: 4 }} />
            </>
          )}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Text style={styles.shopLastVisit}>
          آخرین بازدید: {data.lastVisit ? data.lastVisit : "-"}
        </Text>
        <MaterialCommunityIcons name="clock-outline" size={15} color="#0c8c47" style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
});
  const [keywords, setKeywords] = useState("");
  const [region, setRegion] = useState(null); 
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(
    Array.from({ length: 22 }, (_, i) => ({
      label: `منطقه ${i + 1}`,
      value: `${i + 1}`,
    }))
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [searchResults, setSearchResults] = useState([]);
 const [selectedShops, setSelectedShops] = useState(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  // ⭐ Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      if (optimizedRoute) {
        setOptimizedRoute(null); // go back to search results
        return true; // prevent default exit
      }
      return false; // let system handle back
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [optimizedRoute]);

  // ------------------ Location ------------------
  const getUserLocation = async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled && Location.enableNetworkProviderAsync) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {}
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
        maximumAge: 5000,
        timeout: 10000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      return null;
    }
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setModalVisible(true);
  };

  // ------------------ Search Shops ------------------
  const searchShops = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const user = await getUserLocation();
      if (!user) {
        showAlert("دسترسی به موقعیت مکانی داده نشد یا شناسایی نشد.");
        setLoading(false);
        return;
      }

      if (keywords.replace(/،/g, "").trim().split(/\s+/).length > 3) {
        showAlert("تعداد کلمات باید کمتر از 4 باشد");
        setLoading(false);
        return;
      }
      const response = await axios.post(
        base_url + "/search-shops",
        {
          keywords,
          selectedRegion: region,
          userLocation: user,
        }
      );
      console.log(response)
      setSearchResults(response.data.items);
      setSelectedShops(new Set());
      setOptimizedRoute(null);
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Select Shops ------------------
  const toggleSelectShop = useCallback((shop) => {
    const key = getItemKey(shop);
    setSelectedShops((previousSelected) => {
      const updatedSelection = new Set(previousSelected);
      if (updatedSelection.has(key)) {
        updatedSelection.delete(key);
      } else {
        if (updatedSelection.size >= 5) {
          showAlert("شما فقط می‌توانید ۵ مکان انتخاب کنید.");
          return previousSelected;
        }
        updatedSelection.add(key);
      }
      return updatedSelection;
    });
  }, [getItemKey, showAlert]);

  // ------------------ Optimize Route ------------------
  const optimizeRoute = async () => {
    setLoading(true);
    try {
      const user = await getUserLocation();
      if (!user) {
        showAlert("بدون دریافت موقعیت کاربر امکان بهینه‌سازی مسیر وجود ندارد.");
        setLoading(false);
        return;
      }
      setUserLocation(user);

      const baseList = optimizedRoute || searchResults;

      // Sort selected shops according to display order
      const orderedSelectedShops = baseList.filter((item) =>
        selectedShops.has(getItemKey(item))
      );

      // Debug: print selected shops and stores payload

      const stores = orderedSelectedShops.map((s) => ({
        title: s.title,
        lat: s?.location?.y,
        lng: s?.location?.x,
        neighbourhood: s.neighbourhood || '',
        address: s.address || '',
        lastVisit: s.lastVisit || '',
        durationSec: s.durationSec,
        durationText: s.durationText,
        distanceM: s.distanceM,
        distanceText: s.distanceText,
      }));

      const response = await axios.post(
        base_url + "/optimize-routes",
        {
          user,
          stores,
        }
      );

      setOptimizedRoute(response.data.points);
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ------------------ UI ------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.homeButton}>
            <MaterialCommunityIcons
              name="home-outline"
              size={20}
              color="#0c8c47"
            />
          </TouchableOpacity>
        </Link>

        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>مسيريابی و ویزیت</Text>
          <Text style={styles.headerSubtitle}>
            جستجو و بهينه‌سازی مسير
          </Text>
        </View>
      </View>

      {/* Shop Search Section */}
      <View style={[styles.card, open && styles.cardRaised]}>
        <Text style={styles.cardTitle}>جستجوی فروشگاه‌ها</Text>

        <Text style={styles.label}>کلمات کلیدی( با ویرگول جدا کنید)</Text>

        <View style={{ position: 'relative', justifyContent: 'center' }}>
          <TextInput
            style={styles.input}
            placeholder="فروشگاه‌ها، مکان‌ها و ..."
            placeholderTextColor="#888"
            value={keywords}
            onChangeText={setKeywords}
            textAlign="right"
          />
          {keywords.length > 0 && (
            <TouchableOpacity
              onPress={() => setKeywords("")}
              style={{ position: 'absolute', left: 10, top: 0, bottom: 0, justifyContent: 'center', padding: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons name="close-circle" size={22} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
        <DropDownPicker
          open={open}
          value={region}
          items={items}
          setOpen={setOpen}
          setValue={setRegion}
          setItems={setItems}
          placeholder="انتخاب منطقه"
          textStyle={{ textAlign: "right", writingDirection: "rtl" }}
          style={styles.picker}
          dropDownContainerStyle={styles.dropDownContainer}
          zIndex={1000}
          listMode="FLATLIST"
          flatListProps={{
            keyExtractor: (item) => item.value,
            showsVerticalScrollIndicator: true,
          }}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (keywords.trim() === "" || region === null) && styles.buttonDisabled,
          ]}
          onPress={searchShops}
          disabled={keywords.trim() === "" || region === null}
        >
          <Text style={styles.buttonText}>جستوجو</Text>
        </TouchableOpacity>
      </View>

      {/* Results List, Loading, or Empty State */}
      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0c8c47" />
        </View>
      )}
      {!loading && searchResults.length === 0 && keywords.trim() !== "" && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <MaterialCommunityIcons name="magnify-close" size={48} color="#bbb" style={{ marginBottom: 12 }} />
          <Text style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>
            هیچ نتیجه‌ای برای جستجوی شما پیدا نشد.
          </Text>
        </View>
      )}
      {!loading && searchResults.length > 0 && (
        <View style={[styles.card, { marginTop: 16, flex: 1 }, open && styles.resultsLower]}> 
          <View style={styles.resultsHeader}>
            {!optimizedRoute && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.headerActionButton,
                  (selectedShops.size < 2 || selectedShops.size > 5) &&
                    styles.buttonDisabled,
                ]}
                onPress={optimizeRoute}
                disabled={selectedShops.size < 2 || selectedShops.size > 5}
              >
                <Text style={styles.buttonText}>بهینه سازی مسیر</Text>
              </TouchableOpacity>
            )}

            <View style={styles.resultsHeaderTitleWrapper}>
              <Text style={[styles.cardTitle, styles.resultsHeaderTitle]}>
                {optimizedRoute
                  ? "مسیر بهینه"
                  : `نتایج جستجو (${searchResults.length})`}
              </Text>
              {/* Dynamic selected shops count under results header title */}
              {!optimizedRoute && selectedShops.size > 0 && (
                <Text style={styles.selectedCountText}>
                  {selectedShops.size} فروشگاه انتخاب شده
                </Text>
              )}
            </View>
          </View>

          <FlatList
            data={optimizedRoute || searchResults}
            keyExtractor={(item) => getItemKey(item)}
            renderItem={({ item, index }) => {
              const itemTitle = item.name || item.title;
              const itemKey = getItemKey(item);
              return (
                <ShopCard
                  item={item}
                  index={index}
                  isSelected={selectedShops.has(itemKey)}
                  showOrder={Boolean(optimizedRoute)}
                  displayIndex={(index + 1).toString()}
                  onPress={() => toggleSelectShop(item)}
                  disabled={!!optimizedRoute}
                  styles={styles}
                />
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      )}
      {/* Start Route button */}
      {optimizedRoute && userLocation && (
        <Link
          href={{
            pathname: "/navigation",
            params: {
              routeData: JSON.stringify(optimizedRoute),
              userLocation: JSON.stringify(userLocation)
            }
          }}
          asChild
        >
          <TouchableOpacity style={styles.startRouteButton}>
            <Text style={styles.startRouteText}>
              شروع مسیر ({optimizedRoute.length} توقف)
            </Text>
          </TouchableOpacity>
        </Link>
      )}

      {/* Custom Modal Alert */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>پیام</Text>
            <Text style={styles.modalMessage}>{alertMessage}</Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>باشه</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  selectedCountText: {
    fontSize: 14,
    color: '#0c8c47',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fdf9",
    padding: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 20) + 8 : 16,
  },

  header: {
    backgroundColor: "#0c8c47",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },

  homeButton: {
    position: "absolute",
    left: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrapper: { alignItems: "flex-end", paddingRight: 8 },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
  },
  headerSubtitle: { color: "white", fontSize: 14, marginTop: 4 },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    overflow: 'visible',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "right",
  },
  label: { fontSize: 14, marginTop: 12, textAlign: "right", color: "#333" },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    fontSize: 14,
    backgroundColor: "white",
    textAlign: "right",
  },

  picker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "white",
    zIndex: 1000,
    elevation: 1000,

    },
  dropDownContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 1000,
  },
  cardRaised: {
    zIndex: 5000,
    elevation: 5000,
    position: 'relative',
  },
  resultsLower: {
    zIndex: 0,
    elevation: 0,
  },

  button: {
    backgroundColor: "#0c8c47",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#a5d6a7" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultsHeaderTitleWrapper: {
    flex: 1,
    alignItems: "flex-end",
  },
  resultsHeaderTitle: {
    marginBottom: 0,
    height: 36,
    lineHeight: 36,
  },
  headerActionButton: {
    height: 36,
    paddingVertical: 0,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  /* Modal */
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#d32f2f",
  },
  modalMessage: { fontSize: 16, marginBottom: 20, textAlign: "center" },
  modalButton: {
    backgroundColor: "#0c8c47",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: { color: "white", fontWeight: "bold" },

  shopCard: {
    borderWidth: 1,
    borderColor: "#0c8c47",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  orderBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0c8c47",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 6,
  },
  orderBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  orderText: {
    fontSize: 14,
    color: "#0c8c47",
    marginLeft: 8,
  },
  shopTitleWrapper: {
    flex: 1,
    alignItems: "flex-end",
  },
  shopTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    writingDirection: "rtl", // ✅ force RTL
  },
  resultMetaData: {
    fontSize: 12,
    color: "#444",
    textAlign: "right",
    writingDirection: "rtl",
  },
  shopLastVisit: {
    fontSize: 12,
    color: "#888",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },

  startRouteButton: {
    backgroundColor: "#0c8c47",
    padding: 14,
    borderRadius: 10,
    margin: 16,
    alignItems: "center",
  },
  startRouteText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
});
