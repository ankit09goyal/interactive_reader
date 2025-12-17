import config from "@/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-base-content/70 mt-1">
          Application configuration and settings
        </p>
      </div>

      {/* Current Configuration */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Current Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-base-100 p-4 rounded-lg">
              <label className="text-sm text-base-content/70">App Name</label>
              <p className="font-semibold">{config.appName}</p>
            </div>
            <div className="bg-base-100 p-4 rounded-lg">
              <label className="text-sm text-base-content/70">Domain</label>
              <p className="font-semibold">{config.domainName}</p>
            </div>
            <div className="bg-base-100 p-4 rounded-lg md:col-span-2">
              <label className="text-sm text-base-content/70">Description</label>
              <p className="font-semibold">{config.appDescription}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Plans */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Stripe Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.stripe.plans.map((plan) => (
            <div
              key={plan.priceId}
              className={`bg-base-100 p-4 rounded-lg border ${
                plan.isFeatured ? "border-primary" : "border-base-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.isFeatured && (
                  <span className="badge badge-primary badge-sm">Featured</span>
                )}
              </div>
              <p className="text-sm text-base-content/70 mb-2">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">${plan.price}</span>
                {plan.priceAnchor && (
                  <span className="text-sm text-base-content/50 line-through">
                    ${plan.priceAnchor}
                  </span>
                )}
              </div>
              <div className="mt-3 text-xs text-base-content/50 font-mono">
                {plan.priceId}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Email Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-base-100 p-4 rounded-lg">
            <label className="text-sm text-base-content/70">From (No Reply)</label>
            <p className="font-semibold text-sm">{config.resend.fromNoReply}</p>
          </div>
          <div className="bg-base-100 p-4 rounded-lg">
            <label className="text-sm text-base-content/70">From (Admin)</label>
            <p className="font-semibold text-sm">{config.resend.fromAdmin}</p>
          </div>
          <div className="bg-base-100 p-4 rounded-lg">
            <label className="text-sm text-base-content/70">Support Email</label>
            <p className="font-semibold text-sm">{config.resend.supportEmail}</p>
          </div>
        </div>
      </div>

      {/* Auth Settings */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Authentication Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-base-100 p-4 rounded-lg">
            <label className="text-sm text-base-content/70">Login URL</label>
            <p className="font-semibold text-sm">{config.auth.loginUrl}</p>
          </div>
          <div className="bg-base-100 p-4 rounded-lg">
            <label className="text-sm text-base-content/70">Callback URL</label>
            <p className="font-semibold text-sm">{config.auth.callbackUrl}</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>
          These settings are read from <code className="font-mono">config.js</code>. 
          To modify them, edit the configuration file directly.
        </span>
      </div>
    </div>
  );
}

