@story: Lego Bun Adventure
@flow: [
    "kitchen_intro",
    "bun_making",
    "lego_building",
    "sharing_time"
]

@state: {
    global: {
        skills_learned: [],
        buns_made: [],
        lego_built: []
    },
    persistence: {
        save: ["skills_learned"],
        reset: ["buns_made", "lego_built"]
    }
}

@branches: {
    kitchen_intro: {
        success: "bun_making",
        alternate: "lego_building"
    }
}
