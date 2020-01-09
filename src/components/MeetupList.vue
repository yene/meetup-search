<template>
  <div class="">
    <div v-if="merror !== null" class="error">
      {{merror.message}}
    </div>
    <div v-if="debug" class="debug">{{loggedIn}} {{token}}</div>
    <button v-show="loggedIn === false" v-on:click="signIn">Sign in</button>
    <div v-if="loggedIn">
      <button v-show="coords.latitude === null" v-on:click="shareLocation">Share location to filter by cities</button>
      <div class="filter-bar">
        <select v-if="cities.length > 0" v-model="filterCity">
          <option value="">Current Location</option>
          <option v-for="c in cities" :key="c.id" :value="c">{{c.city}} ({{Math.floor(c.distance)}}km)</option>
        </select>
        <select v-if="cities.length > 0" v-model="radius">
          <option value="smart">smart</option>
          <option value="2.5">4km</option>
          <option value="6">10km</option>
          <option value="15.5">25km</option>
          <option value="31">50km</option>
          <option value="62">100km</option>
        </select>
        <br>
        Time Range: <input type="time" v-model="filterTimeStart"> - <input type="time" v-model="filterTimeEnd"> -
        Date Range: <input type="date" v-model="filterDateStart"> - <input type="date" v-model="filterDateEnd">
        <br>
        <select v-if="cities.length > 0" v-model="filterTopic">
          <option value="">All Topics</option>
          <option v-for="t in topics" :key="t.id" :value="t.id">{{t.name}}</option>
        </select>
        -
        Min Participant: <input min="0" max="99" type="number" v-model="filterMinRSVP">
        <!--Hide Full <input type="checkbox" v-model="filterIsFull">
        Hide Resolute <input type="checkbox" v-model="filterDidResolute">-->
        <br>
        <input type="text" autofocus placeholder="Search..." v-model="filterSearch">
        <button v-on:click="searchMeetups">Search</button>
      </div>

      <table>
        <tr>
          <th>Date</th>
          <th>Group</th>
          <th>Name</th>
        </tr>
        <tr v-for="event in searchResult" :key="event.id">
          <td>{{formatDate(event.time)}}</td>
          <td><abbr :title="event.group.name">{{event.group.name.substr(0, 10)}}</abbr></td>
          <td><a target="_blank" :href="event.link"><i class="fas fa-external-link-alt"></i></a> {{event.name}} ({{event.yes_rsvp_count}})</td>
        </tr>
      </table>

      <div>
        Blacklisted Words
        <input type="text" v-on:keyup.enter="addBlacklistedWord">
        <ul>
          <li v-for="(word, i) in blacklistedWords" :key="i">{{word}} <a href="" v-on:click="blacklistedWords.splice(i, 1); $event.preventDefault();">x</a></li>
        </ul>
      </div>

    </div>
  </div>
</template>

<script>
import {cities, upcomingEvents} from '@/api/meetup.js';
import {OAuthKey} from '@/api/secrets.js';
import axios from 'axios';
import dayjs from 'dayjs';

export default {
  name: 'MeetupList',
  data() {
    return {
      debug: false,
      coords: {latitude: null, longitude: null},
      cities: [],
      radius: 'smart',
      loggedIn: false,
      token: null,
      merror: null,
      blacklistedWords: ['blockchain', 'fintech'],

      filterCity: '',
      filterTimeStart: '06:00',
      filterTimeEnd: '20:00',
      filterDateStart: this.today(),
      filterDateEnd: this.today(),
      filterMinRSVP: '5',
      filterIsFull: false,
      filterDidResolute: false,
      filterSearch: '',
      filterTopic: '',

      topics: [],
      resultCity: null,
      searchResult: [],
    };
  },
  mounted() {
    var token = getHash('access_token');
    if (token !== undefined && token.length > 0) {
      console.log('your access_token token is', token);
      this.loggedIn = true;
      this.token = token;
      localStorage.setItem('token', token);
      window.location.hash = '';
      return;
    }

    try {
      var token = localStorage.getItem('token');
      console.log('your stored token is', token);
      if (token === null) {
        return;
      }
      this.token = token;
      this.loggedIn = true;
    } catch {}

    this.shareLocation();


    this.getTopics();

  },
  methods: {
    signIn() {
      var redirectURL = document.location;
      window.location.replace(`https://secure.meetup.com/oauth2/authorize?client_id=${OAuthKey}&response_type=token&redirect_uri=${redirectURL}`);
      // PopupCenter(`https://secure.meetup.com/oauth2/authorize?client_id=${OAuthKey}&response_type=token&redirect_uri=${REDIRECT_URL}`, 'Meetup Sign In', '900', '500');
    },
    shareLocation() {
      navigator.geolocation.getCurrentPosition((position) => {
        this.coords.latitude = position.coords.latitude;
        this.coords.longitude = position.coords.longitude;
        this.getCities();
      });
    },
    getCities() {
      axios.get(cities(this.token, this.coords.latitude, this.coords.longitude)).then((response) => {
        if (response.data.results !== undefined) {
          this.cities = response.data.results;
        }
      })
      .catch((error) => {
        this.merror = error;
      })
    },
    getTopics() {
      axios.get('https://api.meetup.com/find/topic_categories?access_token=' + this.token).then((response) => {
        if (Array.isArray(response.data)) {
          var t =  response.data;
          t.sort((a, b) => a.name.localeCompare(b.name));
          this.topics = t;
        }
      })
      .catch((error) => {
        this.merror = error;
      })
    },
    addBlacklistedWord(e) {
      var value = e.target.value;
      if (value === '') {
        return;
      }
      this.blacklistedWords.push(value.toLowerCase());
      e.target.value = '';
    },
    formatDate(d) {
      return dayjs(d).format('DD.MM HH:mm')
    },
    today() {
      return yyyymmdd(new Date());
    },
    tomorrow() {
      var currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + 1);
      return yyyymmdd(currentDate);
    },
    searchMeetups() {
      // query builder
      var params = [];

      // if location was shared from the browser
      if (this.coords.latitude !== null && this.coords.longitude !== null) {
        if (this.filterCity === '') { // use current location
          params.push('lat=' + this.coords.latitude);
          params.push('lon=' + this.coords.longitude);
          params.push('radius=' + this.radius);
        } else {
          params.push('lat=' + this.filterCity.lat);
          params.push('lon=' + this.filterCity.lon);
          params.push('radius=' + this.radius);
        }
      }

      // text: Full text search query
      if (this.filterSearch !== '') {
        params.push('text=' + this.filterSearch);
      }

      // self_groups: set to 'include' or 'exclude' or 'only' get groups that the member belongs to.

      // topic_category: Numeric topic category identifier for filtering recommendations by a topic category
      if (this.filterTopic !== '') {
        params.push('topic_category=' + this.filterTopic);
      }

      // fields: A comma-delimited list of optional fields to populate in the response

      // start_date_range - end_date_range in YYYY-MM-DDTHH:MM:SS.
      var sd = dayjs(this.filterDateStart);
      var ed = dayjs(this.filterDateEnd + ' 23:59:59');
      params.push('start_date_range=' + sd.format('YYYY-MM-DDTHH:mm:ss'));
      params.push('end_date_range=' + ed.format('YYYY-MM-DDTHH:mm:ss'));

      // start_time_range - end_time_range in HH:MM:SS
      params.push('start_time_range=' + this.filterTimeStart);
      params.push('end_time_range=' + this.filterTimeEnd);

      var url = upcomingEvents(this.token) + '&page=300&' + params.join('&');
      axios.get(url).then((response) => {
        console.log(response);
        this.resultCity = response.data.city;
        var events = response.data.events;
        events = events.filter((e) => {
          return e.yes_rsvp_count >= Number(this.filterMinRSVP);
        });

        for (var bw of this.blacklistedWords) {
          events = events.filter((e) => {
            if (e.description !== undefined && e.description.toLowerCase().includes(bw)) {
              return false;
            }
            if (e.name.toLowerCase().includes(bw)) {
              return false;
            }
            return true;
          });
        }


        this.searchResult = events;
      })
      .catch((error) => {
        this.merror = error;
      })
    }
  }
};

function PopupCenter(url, title, w, h) {
    // Fixes dual-screen position                         Most browsers      Firefox
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : window.screenX;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : window.screenY;
    var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    var systemZoom = width / window.screen.availWidth;
    var left = (width - w) / 2 / systemZoom + dualScreenLeft
    var top = (height - h) / 2 / systemZoom + dualScreenTop
    var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w / systemZoom + ', height=' + h / systemZoom + ', top=' + top + ', left=' + left);

    // Puts focus on the newWindow
    if (window.focus) newWindow.focus();
}

function getParameter(name) {
	var result = undefined;
	var tmp = [];
	location.search.substr(1).split('&').forEach(function(item) {
		tmp = item.split('=');
		if (tmp[1] !== undefined && tmp[0] === name) {
			result = decodeURIComponent(tmp[1]);
		}
	});
	return result;
}

function getHash(name) {
	var result = undefined;
	var tmp = [];
	location.hash.substr(1).split('&').forEach(function(item) {
		tmp = item.split('=');
		if (tmp[1] !== undefined && tmp[0] === name) {
			result = decodeURIComponent(tmp[1]);
		}
	});
	return result;
}

function yyyymmdd(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.error {
  color: #ea3232;
  font-weight: 600;
  font-size: 1.5rem;
}

input[type="number"] {
  width: 50px;
}

</style>
