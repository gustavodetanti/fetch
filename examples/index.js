(function() {
  function pad(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }

  if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function() {
      return (
        this.getUTCFullYear() +
        '-' +
        pad(this.getUTCMonth() + 1) +
        '-' +
        pad(this.getUTCDate()) +
        'T' +
        pad(this.getUTCHours()) +
        ':' +
        pad(this.getUTCMinutes()) +
        ':' +
        pad(this.getUTCSeconds()) +
        '.' +
        (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z'
      );
    };
  }

  var index = 1;
  var url = '//httpbin.org/get?fetch=true';
  var output = document.getElementById('output');

  function send(index) {
    var bookmark = 'Fetch-' + index;

    console.time(bookmark);

    var result = fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });

    result
      .then(function(response) {
        console.log('Header:', response.headers.get('Content-Type'));

        var json = response.json();

        console.log('Response:', response);

        return json;
      })
      .then(function(json) {
        console.log('Got json:', json);
        console.timeEnd(bookmark);

        output.innerText =
          '🌏 URL: ' +
          location.protocol +
          url +
          '\n' +
          '🕗 Time: ' +
          new Date().toISOString() +
          '\n' +
          '🔊 Response: ' +
          JSON.stringify(json, null, 2);
      })
      ['catch'](function(error) {
        console.error('Failed:', error);
        console.timeEnd(bookmark);
      });
  }

  document.getElementById('fetch').onclick = function() {
    send(index++);
  };
})();
