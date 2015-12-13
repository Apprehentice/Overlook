// SNIPPET http://stackoverflow.com/a/1186309
$.fn.serializeObject = function()
{
  var o = {};
  var a = this.serializeArray();
  $.each(a, function() {
    if (o[this.name] !== undefined) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};
// END SNIPPET

$(function() {
  var self = {
    name: "",
    room: "",
    muted: false,
    level: 0
  }
  var master = "";
  var users = [];

  var sock = new WebSocket("ws://localhost:4080");
  sock.onopen = function(evt) {
    // TODO: Set up connection notifications.

    window.register = function(room, name)
    {
      sock.send(JSON.stringify({
        command: 'register',
        room: room,
        name: name
      }));
      console.log("registered?");
    }
  };

  sock.onmessage = function(evt) {
    console.log(evt);

    var c = JSON.parse(evt.data);

    switch (c.command)
    {
      case 'join':
        self.name = c.name;
        self.room = c.room;

        $('#roomTitle').text(self.room);

        users = c.users;
        users.forEach(function(u) {
          if (u.level === 1)
          {
            master = u.name;
            if (u.name === self.name)
            {
              self.level = 1;
            }
          }

          $('#userList').append(`
              <span class="chatTarget mdl-navigation__link" data-user="` + u.name + `">
                <span class="userName">` + u.name + `</span>
                <label style="float: right; cursor: pointer;" class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect" for="userMute-` + u.name + `">
                  <input type="checkbox" id="userMute-` + u.name + `" class="mdl-icon-toggle__input" ` + (self.level === 1 ? '' : 'disabled' ) + `>
                  <i class="mdl-icon-toggle__label material-icons">visibility_off</i>
                </label>
              </span>
            `);
        });

        componentHandler.upgradeAllRegistered();
        break;
      case 'message':
        var liClass = (c.target !== self.name ? ' other' : '') + (c.target ? ' whisper' : '');
        var authorClass = (c.target === self.name ? 'self' : '') + (c.target === master ? ' master' : '');
        var authorTxt = c.author + (c.target ? ' -> ' + c.target : '') + ': ';
        var contentTxt = c.content;

        $('#chatList')
          .append(`
            <li class="` + liClass + `">
              <span class="author">` + authorTxt + `</span>
              <span class="` + authorClass + ` message">` + contentTxt + `</span>
            </li>
            `)
        break;
      default:
        // NOOP
    }
  };

  $('#registerForm').submit(function(e) {
    sock.send(JSON.stringify($('#registerForm').serializeObject()));
    e.preventDefault();
  });

  $('#chatForm').submit(function(e) {
    sock.send(JSON.stringify($('#chatForm').serializeObject()));
    e.preventDefault();
  });
});
