var app = {
	init: function() {
		app.canvas.init();

		app.resources.init(function() {
			app.floormap.make("00000000|00000000|00000000|00000000|00000000|00000000", function(tiles) {
				app.floormap.useTiles(tiles);

				app.eventListeners.init();
				app.canvas.render();
			});
		});

		app.socket.init(function() {
			app.game.logic();
		});
	},

	canvas: {
		canvas: null,
		ctx: null,
		renderItems: [],

		init: function() {
			app.canvas.canvas = document.getElementsByTagName('canvas')[0];
			app.canvas.ctx = app.canvas.canvas.getContext('2d');

			app.canvas.calibrate();
		},

		calibrate: function() {
			// retina canvas workaround
			var dpi = typeof window.devicePixelRatio === 'undefined' ? 1 : window.devicePixelRatio;

			app.canvas.canvas.width = window.innerWidth * dpi;
			app.canvas.canvas.height = window.innerHeight * dpi;

			app.canvas.canvas.style.width = window.innerWidth + "px";
			app.canvas.canvas.style.height = window.innerHeight + "px";

			app.canvas.ctx.scale(dpi, dpi);
		},

		render: function() {
			app.canvas.ctx.clearRect(0, 0, app.canvas.canvas.width, app.canvas.canvas.height); // clear canvas

			app.canvas.renderItems.forEach(function(item) {
				// TODO: more data types

				if(item.data instanceof Image) {
					app.canvas.ctx.drawImage(
						item.data,
						item.x,
						item.y
					);
				}
			});
		}
	},

	game: {
		logic: function() {
			app.socket.send({
				name: 'handshake' // send a handshake
			}, function(message, handled) {
				if(message.status === "ok") { // check that the handshake is good
					app.socket.send({
						name: 'online_users' // request online users (friends)
					}, function(message, handled) {
						message.data.forEach(function(user) { // loop throught every user and append to bottom bar
							document.querySelector('.friends').innerHTML += "<div class=\"friend\"><img src=\"http://www.habbo.fi/habbo-imaging/avatarimage?user=" + user.username + "&direction=2&head_direction=2\"><b>" + user.username + "</b><i>" + user.motto + "</i></div>";
						});

						handled(message); // handle to free up space
					});

					app.socket.send({
						name: 'badges',
						user_id: '1'
					}, function(message, handled) {
						message.data.forEach(function(badge) {
							document.querySelector('.badges').innerHTML += "<div class=\"badge\" style=\"background-image: url('http://habboo-a.akamaihd.net/c_images/album1584/" + badge.id + ".gif')\"></div>";
						});

						handled(message);
					});
				}

				handled(message); // handle to free up space
			});
		}
	},

	socket: {
		socket: null,
		pending_messages: {},

		init: function(callback) {
			if(typeof callback !== 'function') {
				console.warn("[protohab] [Socket-Init] Callback is not a function");
				callback = new Function;
			}

			app.socket.socket = new WebSocket("ws://127.0.0.1:8071"); // init a WebSocket to localhost port 8071

			app.socket.socket.onopen = callback; // callback when socket is opened

			app.socket.initListeners(); // init listeners
		},

		initListeners: function() {
			app.socket.socket.onmessage = function(message) { // when servers sends a message
				try {
					message = JSON.parse(message.data); // try to parse server JSON
				} catch(e) {
					console.error("Server sent invalid data");
				}

				if(typeof message === "object") {
					if(typeof message.mid === "string") {
						if(typeof app.socket.pending_messages[message.mid] !== "undefined") {
							// call the callback and create another callback for freeing up space (when callback has handled itself -> remove obj property)
							app.socket.pending_messages[message.mid](message, function(message) {
								delete app.socket.pending_messages[message.mid]; // free up space
							});
						} else {
							console.error("Server sent a response for a message that doesn't exist");
						}
					} else {
						console.error("Server sent invalid data");
					}
				} else {
					console.error("Server sent invalid data");
				}
			};
		},

		send: function(message, callback) {
			var message_id = Math.random().toString(36).substr(2); // unique identifier

			app.socket.pending_messages[message_id] = callback; // store callback

			message.mid = message_id; // tell server the message id

			app.socket.socket.send(JSON.stringify(message)); // send message in JSON
		}
	},

	resources: {
		resources: {},
		loadableResources: { // TODO: Get loadable resources from server
			"img/tile.png": "tile",
			"img/tilecursor.png": "tilecursor"
		},

		init: function(callback) {
			if(typeof callback !== 'function') {
				console.warn("[protohab] [LoadResources] Callback is not a function");
				callback = new Function;
			}

			var loaded_resources = 0;

			var finishLoading = function() {
				loaded_resources++;

				if(loaded_resources == Object.keys(app.resources.loadableResources).length) {
					callback();
				}
			};

			Object.keys(app.resources.loadableResources).forEach(function(url) {
				var image = new Image();
				image.src = url;

				image.onload = function() {
					app.resources.resources[app.resources.loadableResources[url]] = image;

					finishLoading();
				};

				image.onerror = function(error) {
					console.error("[protohab] [LoadResources]", error);

					finishLoading();
				};
			});
		}
	},

	eventListeners: {
		init: function() {
			app.canvas.canvas.onmousemove = app.eventListeners.actions.tilecursor;

			app.canvas.canvas.onmousedown = function(e) {
				if((typeof e.isTrusted === 'boolean' && !!e.isTrusted) || e.isTrusted !== 'boolean') {
					app.canvas.canvas.onmousemove = app.eventListeners.actions.moveRoom;
				}
			};

			app.canvas.canvas.onmouseup = function(e) {
				if((typeof e.isTrusted === 'boolean' && !!e.isTrusted) || e.isTrusted !== 'boolean') {
					app.canvas.canvas.onmousemove = app.eventListeners.actions.tilecursor;
				}
			};

			window.onresize = function(e) {
				if((typeof e.isTrusted === 'boolean' && !!e.isTrusted) || e.isTrusted !== 'boolean') {
					app.canvas.calibrate();
					app.canvas.render();
				}
			};
		},

		actions: {
			tilecursor: function(e) {
				var x = e.clientX + document.body.scrollLeft;
				var y = e.clientY + document.body.scrollTop;

				app.canvas.renderItems.forEach(function(item) {
					if(typeof item.extraData === "string") {
						if(item.extraData == "tilecursor") {
							app.canvas.renderItems.splice(app.canvas.renderItems.indexOf(item), 1);
						}
					}
				});

				app.floormap.previousTiles.forEach(function(tile) {
					var bounds = [
						[tile[0] + (64 / 2) + app.floormap.base.x, tile[1] + 32 + app.floormap.base.y],
						[tile[0] + 62 + app.floormap.base.x, tile[1] + (32 / 2) + app.floormap.base.y],
						[tile[0] + (64 / 2) + app.floormap.base.x, tile[1] + app.floormap.base.y],
						[tile[0] + app.floormap.base.x, tile[1] + (32 / 2) + app.floormap.base.y]
					];

					if(app.geometry.inside([x, y], bounds)) {
						/*
						TODO: Pure JS tilecursor
						app.canvas.ctx.strokeStyle = '#fff';
						app.canvas.ctx.lineWidth = '5';
						app.canvas.ctx.beginPath();
						app.canvas.ctx.moveTo(bounds[0][0], bounds[0][1]);
						app.canvas.ctx.lineTo(bounds[1][0], bounds[1][1]);
						app.canvas.ctx.lineTo(bounds[2][0], bounds[2][1]);
						app.canvas.ctx.lineTo(bounds[3][0], bounds[3][1]);
						app.canvas.ctx.closePath();
						app.canvas.ctx.stroke();
						*/

						app.canvas.renderItems.push({
							data: app.resources.resources.tilecursor,
							x: tile[0] + app.floormap.base.x - 1,
							y: tile[1] + app.floormap.base.y - 4,
							extraData: "tilecursor"
						});
					}
				});

				app.canvas.render();
			},

			moveRoom: function(e) {
				if((typeof e.isTrusted === 'boolean' && !!e.isTrusted) || e.isTrusted !== 'boolean') {
					app.canvas.renderItems.forEach(function(item) {
						if(typeof item.extraData === "string") {
							if(item.extraData == "tilecursor") {
								app.canvas.renderItems.splice(app.canvas.renderItems.indexOf(item), 1);
							}
						}
					});

					app.floormap.base.x = e.clientX + document.body.scrollLeft;
					app.floormap.base.y = e.clientY + document.body.scrollTop;

					app.floormap.useTiles(app.floormap.previousTiles);
					app.canvas.render();
				}
			}
		}
	},

	geometry: {
		inside: function(point, vs) {
			// ray-casting algorithm based on
			// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

			var x = point[0], y = point[1];

			var inside = false;
			for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
				var xi = vs[i][0], yi = vs[i][1];
				var xj = vs[j][0], yj = vs[j][1];

				var intersect = ((yi > y) != (yj > y))
				&& (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
				if (intersect) inside = !inside;
			}

			return inside;
		}
	},

	floormap: {
		base: {
			x: 0,
			y: 0
		},
		previousTiles: [], // preserve previously made tiles for rendering

		useTiles: function(tiles) {
			app.canvas.renderItems.forEach(function(item) {
				if(typeof item.extraData === "string") {
					if(item.extraData == "tile") {
						app.canvas.renderItems.splice(app.canvas.renderItems.indexOf(item), 1);
					}
				}
			});

			tiles.forEach(function(tile) {
				app.canvas.renderItems.push({
					data: app.resources.resources.tile,
					x: tile[0] + app.floormap.base.x,
					y: tile[1] + app.floormap.base.y,
					extraData: "tile"
				});
			});
		},

		make: function(floormap, callback) {
			if(typeof callback !== 'function') {
				console.warn("[protohab] [DrawFloormap] Callback is not a function");
				callback = new Function;
			}

			floormap = floormap.split("|");

			var baseLength = floormap[0].length;

			floormap.forEach(function(row) {
				if(row.length != baseLength) {
					console.warn("[protohab] [DrawFloormap] Floormap rows have inconsistent width.");
				}
			});

			var currentCoordinates = {
				x: 0,
				y: 0
			};

			var tiles = [];

			app.floormap.base.x = (window.innerWidth / 2 - Math.abs(baseLength - floormap.length)) / 2;
			app.floormap.base.y = (window.innerHeight / 2 - floormap.length / 2 * 39) / 2;

			floormap.forEach(function(row) {
				row.split('').forEach(function() {
					tiles.push([currentCoordinates.x * 32 + currentCoordinates.y * -32 + app.floormap.base.x,
						currentCoordinates.x * 16 + currentCoordinates.y * 16 + app.floormap.base.y
					]);

					currentCoordinates.y++; // go to next column
				});
				currentCoordinates.y = 0; // reset column
				currentCoordinates.x++; // go to next row
			});

			app.floormap.previousTiles = tiles;

			callback(tiles);
		}
	},
};

app.init();
