let express = require('express');
let http = require('http');
let app = express();

// basic express stuff
// not much going on lol

let server = http.createServer(app);
server.listen(6969, () => {
	console.log("Sever running on port 6969");
});

// socket and player stuff for da game below

let SOCKET_LIST = {};
let randnum;
let DEBUG = false;
let uname; // username
let bltname; // bullet name

// Entity

let Entity = function() {
	let self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	};
	self.update = function() {
		self.updatePosition();
	};
	self.updatePosition = function() {
		self.x += self.spdX;
		self.y += self.spdY;
	};
	self.getDistance = function(pt) {
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
	};
	return self;
};

// Player

let Player = function(id) {
	
	let self = Entity();
	self.id = id;
	self.number = uname;
	self.bltname = bltname;
	self.pressRight = false;
	self.pressLeft = false;
	self.pressUp = false;
	self.pressDown = false;
	self.pressAttack = false;
	self.mouseAngle = 0;
	self.maxSpeed = 10;
	self.hp = 100;
	self.hpMax = 100;
	self.score = 0;
	
	var super_update = self.update;
	self.update = function() {
		self.updateSpd();
		super_update();

		if (self.pressAttack) {
			self.shootBullet(self.mouseAngle);
		};
	};

	self.shootBullet = function(angle) {
		var b = Bullet(self.id, angle);
		b.x = self.x;
		b.y = self.y;
		b.name = self.bltname;
	};
	
	self.updateSpd = function() {
		if (self.pressRight)
			self.spdX = self.maxSpeed;
		else if (self.pressLeft)
			self.spdX = -self.maxSpeed;
		else
			self.spdX = 0;
		
		if (self.pressUp)
			self.spdY = -self.maxSpeed;
		else if (self.pressDown)
			self.spdY = self.maxSpeed;
		else
			self.spdY = 0;
		
	};
	
	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number:self.number,
			bltname:self.bltname,
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
		};
	};
	self.getUpdatePack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
		};
	};
	
	Player.list[id] = self;
	initPack.player.push(self.getInitPack());
	return self;
};
Player.list = {};

// When player gets connected to the game

Player.onConnect = function(socket, username, bulletname) {
	
	randnum = Math.floor(Math.random() * 900000);
	let NAMES = [];
	let player;

	if (username !== '') {
		for (let i in Player.list) {
			NAMES.push(Player.list[i].number);
		};

		var usernameToLowerCase = username.toLowerCase();
		if (NAMES.indexOf(usernameToLowerCase) > -1) {
			socket.emit('userValidation', {
				success:false,
				reason:"That name is already taken in this game.",
			});
			return;
		};
		if (username.length <= 2) {
			socket.emit('userValidation', {
				success:false,
				reason:"Too short name.",
			});
			return;
		};

		if (username.length > 10)
			username = username.substring(0, 10);
		
		if (username.indexOf(' ') >= 0)
			username = username.replace(/\s/g, '-');
		
		uname = username;
	} else {
		uname = randnum;
	};

	if (bulletname == '')
		bulletname = '🅱️';
	
	if (bulletname.length > 7)
		bulletname = bulletname.substring(0, 7);
	
	if (bulletname.indexOf(' ') >= 0)
		bulletname = bulletname.replace(/\s/g, '-');
		
	bltname = bulletname;
	socket.emit('userValidation', {
		success:true
	});
	player = Player(socket.id);

	for (let i in SOCKET_LIST) {
		SOCKET_LIST[i].emit('addToChat', {
			message: Player.list[socket.id].number + " joined the game."
		});
	};

	socket.on('keyPress', function(data) {
		if (data.inputId === 'left')
			player.pressLeft = data.state;
		else if (data.inputId === 'right')
			player.pressRight = data.state;
		else if (data.inputId === 'up')
			player.pressUp = data.state;
		else if (data.inputId === 'down')
			player.pressDown = data.state;
		else if (data.inputId === 'attack')
			player.pressAttack = data.state;
		else if (data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
	});
	
	socket.emit('init', {
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack(),
	});
	
};

// All init pack - initial pack loaded once when joining the lobby

Player.getAllInitPack = function() {
	let players = [];
	for (let i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket) {
	for (let i in SOCKET_LIST) {
		SOCKET_LIST[i].emit('addToChat', {
			message: Player.list[socket.id].number + " left the game."
		});
	};
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
};

Player.update = function() {
	let packet = [];
	for (let i in Player.list) {
		let player = Player.list[i];
		player.update();
		packet.push(player.getUpdatePack());
	};
	return packet;
};

// Random killed message for the chat

let randKilledMsg = () => {
	let randomMessage = [
	'obliterated',
	'murdered',
	'dunked on',
	'shot',
	'headshotted',
	'had a massive nut on',
	'showed a lesson to',
	'managed to undefine'
	];
	let randMath = Math.floor(Math.random() * randomMessage.length);
	return randomMessage[randMath];
}

// Bullet

let Bullet = function(parent, angle) {
	let self = Entity();
	self.id = Math.random();
	self.spdX = Math.cos(angle / 180 * Math.PI) * 10;
	self.spdY = Math.sin(angle / 180 * Math.PI) * 10;
	self.parent = parent;
	self.name = Player.list[self.parent].bltname;
	self.timer = 0;
	self.toRemove = false;
	let super_update = self.update;
	self.update = function() {
		if (self.timer++ > 100)
			self.toRemove = true;
		super_update();

		for (let i in Player.list) {
			var p = Player.list[i];
			if (self.getDistance(p) < 32 && self.parent !== p.id) {
				p.hp -= p.bltname.length / 2;
				if (p.hp <= 0) {
					let shooter = Player.list[self.parent];
					if (shooter)
						shooter.score += 1;
						msg = randKilledMsg();
						for (let i in SOCKET_LIST) {
							SOCKET_LIST[i].emit('addToChat', {
								name: shooter.number,
								message: msg,
								victim: p.number,
							});
						};
					p.hp = p.hpMax;
					p.x = Math.random() * 499;
					p.y = Math.random() * 499;
				};
				self.toRemove = true;
			};
		};
	};
	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			name:self.name
		};
	};
	self.getUpdatePack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		};
	};
	
	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
};

Bullet.list = {};

Bullet.update = function() {

	let packet = [];
	for (let i in Bullet.list) {
		let bullet = Bullet.list[i];
		bullet.update();
		if (bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			packet.push(bullet.getUpdatePack());
	};
	return packet;
};

// Bullet's initial pack of data

Bullet.getAllInitPack = function() {
	let bullets = [];
	for (let i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
};

// main socket stuff
let io = require('socket.io').listen(server);
io.on('connection', function(socket) {
	
	socket.id = socket.handshake.query.clientId;
	SOCKET_LIST[socket.id] = socket;
	console.log(`new connection, clientId: ${socket.id}`);

	socket.on('userName', function(data) {
		Player.onConnect(socket, data.username, data.bulletname);
	});
	
	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
		console.log(`disconnected, clientId: ${socket.id}`);
	});

	socket.on('sendMsgToServer', function(msg) {
		let playerName = Player.list[socket.id].number
		for (let i in SOCKET_LIST) {
			SOCKET_LIST[i].emit('addToChat', {
				name:playerName,
				message:msg
			});
		};
	});

	socket.on('evalServer', function(data) {
		if (!DEBUG) return;
		let res = eval(data);
		socket.emit('evalAnswer', res);
	});
	
});

// Nice error handling lmao xd

process.on('uncaughtException', (err) => {
	console.log("Error occured:", err);
});

var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};

// loop

setInterval(function() {
	let packet = {
		player:Player.update(),
		bullet:Bullet.update()
	};
	for (let i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('init', initPack);
		socket.emit('update', packet);
		socket.emit('remove', removePack);
	};
	
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
	
}, 1000 / 50);