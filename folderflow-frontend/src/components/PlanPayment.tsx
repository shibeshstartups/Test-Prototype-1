// Fix for Razorpay SDK type error
declare global {
  interface Window {
    Razorpay: any;
  }
}
import React, { useState, useEffect } from "react";
import axios from "axios";

const plans = [
  { name: "Free", price: 0, features: ["2GB transfers", "Basic support"] },
  { name: "Pro", price: 299, features: ["100GB transfers", "Priority support"] },
  { name: "Enterprise", price: 999, features: ["Unlimited transfers", "Dedicated support"] },
];

const PlanPayment: React.FC = () => {
  const [selected, setSelected] = useState("Free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get("http://localhost:4000/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setCurrentPlan(res.data.plan))
      .catch(() => setCurrentPlan(""));
    axios.get("http://localhost:4000/api/transfers", {
      headers: { Authorization: `Bearer ${token}` },
      params: { userId: JSON.parse(atob(token.split('.')[1])).id },
    })
      .then(res => setPayments(res.data.filter((t: any) => t.action === "payment")))
      .catch(() => setPayments([]));
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:4000/api/payments/razorpay/initiate", { plan: selected }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const options = res.data.razorpayOptions;
      // Use public env variable for key
      options.key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || options.key;
      options.handler = async function (response: any) {
        try {
          await axios.post("http://localhost:4000/api/payments/razorpay/verify", {
            ...response,
            plan: selected,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCurrentPlan(selected);
          alert("Payment successful! Your plan has been upgraded.");
        } catch {
          setError("Payment verification failed. If you were charged, your plan will be upgraded automatically after webhook confirmation.");
        }
      };
      // @ts-ignore
      if (!window.Razorpay) {
        setError("Razorpay SDK not loaded. Please try again later.");
        setLoading(false);
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      setError("Payment initiation failed.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mb-8">
      <h2 className="text-xl font-bold mb-4">Choose Your Plan</h2>
      <div className="mb-4 text-green-700 font-semibold">Current Plan: {currentPlan || "Loading..."}</div>
      <div className="flex gap-4 mb-4">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={`border rounded p-4 flex-1 cursor-pointer ${selected === plan.name ? "border-blue-600" : "border-gray-300"}`}
            onClick={() => setSelected(plan.name)}
          >
            <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
            <div className="text-blue-700 font-bold text-2xl mb-2">₹{plan.price}</div>
            <ul className="text-sm mb-2">
              {plan.features.map(f => <li key={f}>• {f}</li>)}
            </ul>
            {selected === plan.name && plan.price > 0 && (
              <button
                className="bg-green-600 text-white px-4 py-2 rounded mt-2"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? "Processing..." : "Pay with Razorpay"}
              </button>
            )}
          </div>
        ))}
      </div>
  {error && <div className="text-red-500 mt-2" role="alert">{error}</div>}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Payment History</h3>
        {payments.length === 0 ? (
          <div className="text-gray-400">No payments yet.</div>
        ) : (
          <ul className="text-sm">
            {payments.map((p: any) => (
              <li key={p.id} className="text-gray-700">
                <span>Paid for {p.action.split(':')[1]} on {p.timestamp}</span>
                {/* Hide sensitive details, only show status and plan */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PlanPayment;
