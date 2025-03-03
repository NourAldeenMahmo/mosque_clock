import { useState, useEffect } from "react";
import { FaSearch, FaMoon, FaSun } from "react-icons/fa";
import { toHijri } from "hijri-converter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import "./App.css";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        currentTime: "Current Time",
        prayerTimes: "Prayer Times",
        weather: "Weather",
        enterCity: "Enter city name...",
        loadingPrayerTimes: "Loading prayer times...",
        failedToLoad:
          "Failed to load data. Please check your internet connection or try again later.",
        fajr: "Fajr",
        dhuhr: "Dhuhr",
        asr: "Asr",
        maghrib: "Maghrib",
        isha: "Isha",
        gregorian: "Gregorian",
        hijri: "Hijri",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        invalidCity: "Please enter a valid city name.",
        noData: "No data available for the specified city.",
        cityNotFound:
          "City not found. Please check the city name and try again.",
      },
    },
    ar: {
      translation: {
        currentTime: "الوقت الحالي",
        prayerTimes: "مواقيت الصلاة",
        weather: "الطقس",
        enterCity: "أدخل اسم المدينة...",
        loadingPrayerTimes: "جاري تحميل مواقيت الصلاة...",
        failedToLoad:
          "فشل تحميل البيانات. يرجى التحقق من اتصال الإنترنت أو المحاولة مرة أخرى لاحقًا.",
        fajr: "الفجر",
        dhuhr: "الظهر",
        asr: "العصر",
        maghrib: "المغرب",
        isha: "العشاء",
        gregorian: "الميلادي",
        hijri: "الهجري",
        darkMode: "الوضع الليلي",
        lightMode: "الوضع النهاري",
        invalidCity: "الرجاء إدخال اسم مدينة صحيح.",
        noData: "لا توجد بيانات متاحة للمدينة المحددة.",
        cityNotFound:
          "لم يتم العثور على المدينة. يرجى التحقق من اسم المدينة والمحاولة مرة أخرى.",
      },
    },
  },
  lng: "ar",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

function App() {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [showCards, setShowCards] = useState(false);
  const [timezone, setTimezone] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // دالة الوقت
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (timezone) {
        const localTime = new Date(
          now.toLocaleString("en-US", { timeZone: timezone })
        );
        setTime(localTime);
      } else {
        setTime(now);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  // جلب البيانات عند تغيير المدينة
  useEffect(() => {
    const fetchData = async () => {
      if (!city || !country) {
        setError(t("invalidCity"));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // جلب مواقيت الصلاة
        const prayerResponse = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=2`
        );
        if (!prayerResponse.ok) {
          throw new Error("Failed to fetch prayer times");
        }
        const prayerData = await prayerResponse.json();
        if (prayerData.code === 200) {
          setPrayerTimes(prayerData.data.timings);
        } else {
          throw new Error(t("noData"));
        }

        // جلب الطقس
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=990f32902e2817e0708e97374ba90191&units=metric&lang=ar`
        );
        if (!weatherResponse.ok) {
          throw new Error("Failed to fetch weather");
        }
        const weatherData = await weatherResponse.json();
        if (weatherData.cod === 200) {
          setWeather({
            temp: weatherData.main.temp,
            description: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon,
          });
        } else {
          throw new Error("Failed to fetch weather");
        }

        // جلب المنطقة الزمنية باستخدام OpenStreetMap Nominatim
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${city}&country=${country}&format=json&limit=1`
        );
        if (!geocodeResponse.ok) {
          throw new Error("Failed to fetch geocode data");
        }
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.length > 0) {
          const { lat, lon } = geocodeData[0];
          // eslint-disable-next-line no-unused-vars
          const timestamp = Math.floor(Date.now() / 1000);
          const timezoneResponse = await fetch(
            `https://api.timezonedb.com/v2.1/get-time-zone?key=9PAOFU7XSQIR&format=json&by=position&lat=${lat}&lng=${lon}`
          );
          if (!timezoneResponse.ok) {
            throw new Error("Failed to fetch timezone data");
          }
          const timezoneData = await timezoneResponse.json();
          if (timezoneData.status === "OK") {
            setTimezone(timezoneData.zoneName);
          } else {
            throw new Error("Failed to fetch timezone");
          }
        } else {
          throw new Error(t("cityNotFound"));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || t("failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    if (showCards) {
      fetchData();
    }
  }, [showCards, city, country, t]);

  // تحويل التاريخ إلى هجري
  const getHijriDate = (date) => {
    const hijriDate = toHijri(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    return `${hijriDate.hy}-${hijriDate.hm}-${hijriDate.hd}`;
  };

  // تحويل التاريخ إلى ميلادي
  const getGregorianDate = (date) => {
    return date.toLocaleDateString("en-GB");
  };

  // دالة البحث عن المدن
  const fetchCitySuggestions = async (query) => {
    if (!query) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?city=${query}&format=json&addressdetails=1&limit=5`
      );
      const data = await response.json();
      const suggestions = data.map((item) => ({
        city: item.address.city || item.address.town || item.address.village,
        country: item.address.country,
        display_name: `${item.address.city || item.address.town}, ${
          item.address.country
        }`,
      }));
      setCitySuggestions(suggestions);
    } catch (err) {
      console.error("Error fetching city suggestions:", err);
    }
  };

  // تغيير الوضع الليلي
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div
      className={`min-h-screen min-w-[100vw] flex flex-col items-center justify-center p-4 ${
        darkMode ? " text-white" : " text-black"
      }`}
    >
      <div
        className={`min-h-16 w-screen absolute top-0 shadow-lg shadow-[#e97ee9]${
          darkMode ? " text-white bg-[#1f293768]" : " text-black bg-[#ffffff1d]"
        }`}
      >
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 p-2 bg-[#e97ee9] rounded-lg"
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
        <button
          onClick={() =>
            i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")
          }
          className="absolute top-3 right-16 p-2 bg-[#e97ee9] rounded-lg"
        >
          {i18n.language === "ar" ? "English" : "العربية"}
        </button>
      </div>

      {/* حقل البحث */}
      <div
        className={`w-9/12 h-9 absolute top-5 flex justify-center ${
          darkMode ? "bg-[#ffffff1d]" : "bg-white"
        } bg-opacity-30 backdrop-blur-md shadow-lg rounded-lg py-6 px-2 mb-6 relative`}
      >
        <div className="flex items-center w-screen ">
          <FaSearch className="text-[#e97ee9] mr-2 cursor-pointer" />
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (debounceTimer) clearTimeout(debounceTimer);
              setDebounceTimer(
                setTimeout(() => fetchCitySuggestions(e.target.value), 300)
              );
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                setShowCards(true);
              }
            }}
            placeholder={t("enterCity")}
            className={`w-full p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e97ee9] bg-transparent ${
              darkMode ? "text-white" : "text-black"
            }`}
          />
        </div>
        {citySuggestions.length > 0 && (
          <div
            className={`absolute ${
              darkMode ? "bg-[#280035de]" : "bg-white"
            } w-11/12 mt-7 border rounded shadow-lg`}
          >
            {citySuggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => {
                  setCity(suggestion.city);
                  setCountry(suggestion.country);
                  setCitySuggestions([]);
                }}
                className={`p-2  cursor-pointer ${
                  darkMode ? "hover:bg-[#ffffff48]" : "hover:bg-gray-200"
                }`}
              >
                {suggestion.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الكاردات */}
      <AnimatePresence>
        {showCards && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-center gap-6 w-full max-w-6xl"
          >
            {/*  كارد الوقت  */}
            <div
              className={`card ${
                darkMode ? "bg-[#ffffff1d]" : "bg-white"
              } bg-opacity-30 backdrop-blur-md shadow-lg rounded-lg p-6 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] -z-20`}
            >
              <h2 className="text-xl font-bold text-center shadow-xl shadow-[#eba8eb56] rounded-lg p-4 mb-6">
                {t("currentTime")}
              </h2>
              <p className="text-center mt-16">
                {time.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </p>
              <p className="text-center mt-4">
                {t("gregorian")}: {getGregorianDate(time)}
              </p>
              <p className="text-center mt-4">
                {t("hijri")}: {getHijriDate(time)}
              </p>
            </div>

            {/* كارد مواقيت الصلاة */}
            <div
              className={`card ${
                darkMode ? "bg-[#ffffff1d]" : "bg-white"
              } bg-opacity-30 backdrop-blur-md shadow-lg rounded-lg p-6 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] -z-20`}
            >
              <h2 className="text-xl font-bold text-center shadow-xl shadow-[#eba8eb56] rounded-lg p-4 mb-6">
                {t("prayerTimes")}
              </h2>
              {loading ? (
                <p className="text-center mt-4">{t("loadingPrayerTimes")}</p>
              ) : error ? (
                <p className="text-center text-red-500">{error}</p>
              ) : prayerTimes ? (
                <ul className="mt-4 space-y-5 px-2 pt-5">
                  {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((prayer) => (
                    <li key={prayer} className="flex justify-between">
                      <span>{prayerTimes[prayer]}</span>
                      <span>{t(prayer.toLowerCase())}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* كارد الطقس */}
            <div
              className={`card ${
                darkMode ? "bg-[#ffffff1d]" : "bg-white"
              } bg-opacity-30 backdrop-blur-md shadow-lg rounded-lg p-6 w-full md:w-full lg:w-[calc(33.33%-16px)] -z-20`}
            >
              <h2 className="text-xl font-bold text-center shadow-xl shadow-[#eba8eb56] rounded-lg p-4 mb-6">
                {t("weather")}
              </h2>
              {weather ? (
                <div className="text-center">
                  <img
                    src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.description}
                    className="mx-auto size-48"
                  />
                  <p className="mt-4">
                    {weather.temp}°C - {weather.description}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
