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
  var target = "";

  var sock = new WebSocket('ws://' + window.location.host);
  sock.onopen = function(evt) {
    window.targetUser = function(evt)
    {
      $('.chatTarget.active').removeClass('active');
      $('.chatTarget[data-user="' + evt.data + '"]').addClass('active');

      $('#roomTitle').text(self.room + (evt.data ? " - " + evt.data : ''));
      target = evt.data;
    };

    window.register = function(room, name)
    {
      sock.send(JSON.stringify({
        command: 'register',
        room: room,
        name: name
      }));
      console.log("registered?");
    };

    window.muteUser = function(user)
    {
      var check = $('#userList input[data-user="' + user + '"]')[0];
      if (check !== undefined)
        sock.send(JSON.stringify({
          command: 'mute',
          target: user,
          muted: check.checked
        }));
    };

    window.bindUserListEvents = function()
    {
      $('#userList span').each(function() {
        $(this).on('click', null, $(this).data('user'), targetUser);
      });
    };

    window.chat = {};
    window.chat.message = function(author, target, content)
    {
      var liClass = (target !== self.name && author !== self.name ? ' other' : '') + (target ? ' whisper' : '') + ' message';
      var authorClass = (target === self.name ? 'self' : '') + (target === master ? ' master' : '');
      var authorTxt = author + (target ? ' -> ' + target : '') + ': ';
      var contentTxt = content;

      $('#chatList')
        .append(`
          <li class="` + liClass + `">
            <span class="author">` + authorTxt + `</span>
            <span class="` + authorClass + ` message">` + contentTxt + `</span>
          </li>
        `)

      if (autoScroll)
        $('#contentScroll').scrollTop($('#content').height());
    };

    window.chat.notify = function(content)
    {
      $('#chatList')
        .append(`
          <li class="notification">
            <span class="text">` + content + `</span>
          </li>
        `)

      if (autoScroll)
        $('#contentScroll').scrollTop($('#content').height());
    };

    window.chat.error = function(content)
    {
      $('#chatList')
        .append(`
          <li class="error">
            <span class="text">` + content + `</span>
          </li>
        `)

      if (autoScroll)
        $('#contentScroll').scrollTop($('#content').height());

      $('#loginError').text(content);
      $('#loginError').show();
    };

    window.chat.warning = function(content)
    {
      $('#chatList')
        .append(`
          <li class="warning">
            <span class="text">` + content + `</span>
          </li>
        `)

      if (autoScroll)
        $('#contentScroll').scrollTop($('#content').height());
    };
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
          $('#userList').append(`
              <span class="chatTarget mdl-navigation__link" data-user="` + u.name + `">
                <span class="userName">` + u.name + `</span>
                <label style="float: right; cursor: pointer;" class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect" for="userMute-` + u.name + `">
                  <input type="checkbox" id="userMute-` + u.name + `" class="mdl-icon-toggle__input" onclick="muteUser('` + u.name + `')" data-user="` + u.name + `" ` + (self.level === 1 ? '' : 'disabled' ) + `>
                  <i class="mdl-icon-toggle__label material-icons">visibility_off</i>
                </label>
              </span>
            `);
        });

        $('#loginModal').hide();
        $('#loginShade').hide();

        $('#chatInput').prop('disabled', false);

        bindUserListEvents();
        componentHandler.upgradeAllRegistered();
        break;
      case 'message':
        chat.message(c.author, c.target, c.content);
        break;
      case 'adduser':
        if (c.level === 1)
        {
          master = c.name;
          if (c.name === self.name)
          {
            self.level = 1;
          }
        }

        $('#userList').append(`
          <span class="chatTarget mdl-navigation__link" data-user="` + c.name + `">
            <span class="userName">` + c.name + `</span>
            <label style="float: right; cursor: pointer;" class="mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect" for="userMute-` + c.name + `">
              <input type="checkbox" id="userMute-` + c.name + `" class="mdl-icon-toggle__input" onclick="muteUser('` + c.name + `')" data-user="` + c.name + `" ` + (self.level === 1 ? '' : 'disabled' ) + `>
              <i class="mdl-icon-toggle__label material-icons">visibility_off</i>
            </label>
          </span>
        `);

        bindUserListEvents();
        componentHandler.upgradeAllRegistered();

        chat.notify(c.name + ' has joined the party!');
        break;
      case 'removeuser':
        $('#userList[data-user="' + c.name + '"]').remove();
        chat.notify(c.name + ' has left the party!');
        break;
      case 'error':
        chat.error(c.content);
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
    var command = $('#chatForm').serializeObject();
    command.target = target;
    sock.send(JSON.stringify(command));
    e.preventDefault();
  });

  var autoScroll = true;
  $('#contentScroll').on('scroll', function() {
    autoScroll = $(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 100;
  });
});
