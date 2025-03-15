- Technical Product Specification: Cooperative Multiplayer Zombie Survival Game (Three.js)
1. Game Overview
Genre: Cooperative multiplayer browser-based 3D zombie survival game.

Core Mechanics:
New players spawn with a simple pistol to fight zombie hordes.

Players cannot harm each other; gameplay is fully cooperative against zombies.

Powerups (e.g., increased damage, speed, health) near one player apply to all nearby players, encouraging teamwork.

Powerups are presented always as an option between 1 2 or 3 items, sometimes bad choices! But user cannot get more tha none as being driven backwards. 

Players earn experience points (EXP) for zombies killed, with EXP shared among nearby players.

Choose minecraft like polygon shapes for zombies and bosses and heros so that we don't have to make a lot of complicated 3D renders with graphics.

Zombies spawn mainly in front of players so player is driven back.

At least 500 zombies, or even a thousand, I'm talking real horde man so optimization is important 

View is from behind player looking forward to the horde advancing. 

Fast paced music thumbs in background and sound effects from zombies overlaid (user can turn off music or gameplay)

** Multiplayer **
Harder zombies spawn as more players cluster together, incentivizing grouping for survival and higher rewards.

Use WebRTC with socket.io UDP do **not use WebSockets** for multiplayer. Use Zustand to maintain state. 

** Revenue ** 
It is free to play we will allow people to purchase bosses - harder bosses last longer on screen so they cost more of course. This can be on roadmap i it is not minimum viable. 