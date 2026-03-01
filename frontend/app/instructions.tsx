const items = [
    {
      image: "../public/inst1.png",
      text: "Your first description goes here. Add whatever text you want to explain this section.",
    },
    {
      image: "../public/inst2.png",
      text: "Your second description goes here. Keep it concise or make it long — up to you.",
    },
    {
      image: "../public/inst3.png",
      text: "Third section text goes here. Great for features, steps, or storytelling.",
    },
    {
      image: "../public/inst4.png",
      text: "Fourth and final section. End with something memorable.",
    },
  ];
  
  export default function ZigZag() {
    return (
      <div className="flex flex-col gap-16 px-8 py-16 max-w-4xl mx-auto">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-10 ${
              i % 2 === 1 ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <img
              src={item.image}
              alt={`image ${i + 1}`}
              className="w-1/2 rounded-xl object-cover aspect-video"
            />
            <p className="w-1/2 text-lg leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    );
  }