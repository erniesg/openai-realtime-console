@scene: kitchen_intro
@ref: kitchen_1

@narrate
Welcome to our magical kitchen, where we make yummy pork buns and build amazing things!

@speak: chef_bao
[emotion: happy]
"Hello little friend! I'm Chef Bao, and I love making delicious pork buns!"

@speak: brick_buddy
[emotion: excited]
"And I'm Brick Buddy! We can build anything with our imagination!"

@input: voice
[prompt: "What would you like to do first?"]
[options]
- "Make pork buns with Chef Bao" -> bun_making
- "Build with Brick Buddy" -> lego_building
