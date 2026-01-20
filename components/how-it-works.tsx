import { Clipboard, TrendingUp, MessageCircle } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      icon: Clipboard,
      title: "Paste Contract Address",
      description: "Enter any Solana token contract address to start tracking its market cap in real-time.",
    },
    {
      icon: TrendingUp,
      title: "Watch Market Data",
      description: "Get live updates on price, market cap, and 24h Waifuges powered by Jupiter API.",
    },
    {
      icon: MessageCircle,
      title: "See Emotional Reactions",
      description: "Your Waifu reacts with 6 different emotions based on price movements and provides live commentary.",
    },
  ]

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How it works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track your favorite tokens and watch as Claude-Waifu reacts to every market movement
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
