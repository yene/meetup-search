
const host = 'api.meetup.com';
const apiURL = 'https://' + host + '/';

export function cities(token, latitude, longitutde) {
  return apiURL + '2/cities?&sign=true&photo-host=public&lon='+longitutde+'&lat='+latitude+'&page=20&access_token=' + token;
}

// https://www.meetup.com/de-DE/meetup_api/docs/find/upcoming_events/?uri=%2Fmeetup_api%2Fdocs%2Ffind%2Fupcoming_events%2F
export function upcomingEvents(token) {
  return apiURL + 'find/upcoming_events?access_token=' + token + '&order=time';
}
