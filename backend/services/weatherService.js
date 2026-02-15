import axios from 'axios';

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async getCurrentWeather(lat, lon) {
    if (!this.apiKey) {
      return this._getDefaultWeather();
    }

    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'vi',
        },
      });

      const data = response.data;
      return {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed,
        condition: this._mapCondition(data.weather[0].main),
        city: data.name,
      };
    } catch (error) {
      console.error('Weather API error:', error.message);
      return this._getDefaultWeather();
    }
  }

  async getForecast(lat, lon) {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'vi',
          cnt: 40,
        },
      });

      return this._groupByDay(response.data.list);
    } catch (error) {
      console.error('Forecast API error:', error.message);
      return [];
    }
  }

  _mapCondition(weatherMain) {
    const conditionMap = {
      Clear: 'sunny',
      Clouds: 'cloudy',
      Rain: 'rainy',
      Drizzle: 'rainy',
      Thunderstorm: 'stormy',
      Snow: 'snowy',
      Mist: 'foggy',
      Fog: 'foggy',
      Haze: 'foggy',
    };
    return conditionMap[weatherMain] || 'cloudy';
  }

  getSeasonContext(temperature) {
    if (temperature >= 35) return { season: 'hot_summer', layering: 'minimal' };
    if (temperature >= 28) return { season: 'warm', layering: 'light' };
    if (temperature >= 22) return { season: 'mild', layering: 'moderate' };
    if (temperature >= 15) return { season: 'cool', layering: 'warm' };
    return { season: 'cold', layering: 'heavy' };
  }

  getClothingSuggestions(weather) {
    const { temperature, condition } = weather;
    const suggestions = {
      tops: [],
      bottoms: [],
      outerwear: [],
      accessories: [],
      footwear: [],
    };

    if (temperature >= 30) {
      suggestions.tops = ['t-shirt', 'tank-top', 'áo sơ mi ngắn tay'];
      suggestions.bottoms = ['quần short', 'váy', 'quần vải mỏng'];
      suggestions.footwear = ['sandal', 'giày thể thao thoáng'];
    } else if (temperature >= 22) {
      suggestions.tops = ['áo sơ mi', 't-shirt', 'áo thun dài tay'];
      suggestions.bottoms = ['quần jeans', 'quần kaki', 'váy midi'];
      suggestions.footwear = ['giày thể thao', 'giày lười'];
    } else if (temperature >= 15) {
      suggestions.tops = ['áo len mỏng', 'áo sơ mi dài tay', 'hoodie'];
      suggestions.bottoms = ['quần jeans', 'quần kaki dày'];
      suggestions.outerwear = ['áo khoác nhẹ', 'cardigan'];
      suggestions.footwear = ['giày boot', 'giày thể thao'];
    } else {
      suggestions.tops = ['áo len dày', 'áo giữ nhiệt'];
      suggestions.bottoms = ['quần jeans dày', 'quần nỉ'];
      suggestions.outerwear = ['áo phao', 'áo khoác dạ', 'áo khoác gió'];
      suggestions.accessories = ['khăn quàng', 'mũ len', 'găng tay'];
      suggestions.footwear = ['giày boot', 'giày da'];
    }

    if (condition === 'rainy' || condition === 'stormy') {
      suggestions.outerwear.push('áo mưa', 'áo khoác chống nước');
      suggestions.accessories.push('ô/dù');
      suggestions.footwear = ['giày chống nước', 'ủng'];
    }

    if (condition === 'sunny') {
      suggestions.accessories.push('kính râm', 'mũ/nón');
    }

    return suggestions;
  }

  _groupByDay(list) {
    const days = {};
    list.forEach((item) => {
      const date = item.dt_txt.split(' ')[0];
      if (!days[date]) {
        days[date] = {
          date,
          temps: [],
          conditions: [],
          icons: [],
        };
      }
      days[date].temps.push(item.main.temp);
      days[date].conditions.push(item.weather[0].main);
      days[date].icons.push(item.weather[0].icon);
    });

    return Object.values(days)
      .map((day) => ({
        date: day.date,
        tempMin: Math.round(Math.min(...day.temps)),
        tempMax: Math.round(Math.max(...day.temps)),
        condition: this._mostFrequent(day.conditions),
        icon: day.icons[Math.floor(day.icons.length / 2)],
      }))
      .slice(0, 5);
  }

  _mostFrequent(arr) {
    const freq = {};
    arr.forEach((item) => {
      freq[item] = (freq[item] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }

  _getDefaultWeather() {
    return {
      temperature: 28,
      feelsLike: 30,
      humidity: 70,
      description: 'Không có dữ liệu',
      icon: '01d',
      windSpeed: 3,
      condition: 'warm',
      city: 'Unknown',
    };
  }
}

export default new WeatherService();

