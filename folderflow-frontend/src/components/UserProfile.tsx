import React, { useState, useEffect } from "react";
import axios from "axios";

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeStatus, setUpgradeStatus] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get("http://localhost:4000/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });
  }, []);

  const handleUpgrade = async (plan: string) => {
    setUpgradeStatus("");
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post("http://localhost:4000/api/payments/razorpay/initiate", { plan }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const options = res.data.razorpayOptions;
      options.handler = async function (response: any) {
        try {
          await axios.post("http://localhost:4000/api/payments/razorpay/verify", {
            ...response,
            plan,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUpgradeStatus("Upgrade successful! Your plan is now " + plan);
        } catch {
          setUpgradeStatus("Upgrade verification failed. If you were charged, your plan will be upgraded automatically after webhook confirmation.");
        }
      };
      // @ts-ignore
      if (!window.Razorpay) {
        setUpgradeStatus("Razorpay SDK not loaded. Please try again later.");
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setUpgradeStatus("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      setUpgradeStatus("Upgrade initiation failed.");
    }
  };

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow mb-8">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      <div className="mb-2"><strong>Name:</strong> {profile?.name}</div>
      <div className="mb-2"><strong>Email:</strong> {profile?.email}</div>
      <div className="mb-2"><strong>Current Plan:</strong> {profile?.plan}</div>
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Upgrade Plan</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={() => handleUpgrade('Pro')}>Upgrade to Pro</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => handleUpgrade('Enterprise')}>Upgrade to Enterprise</button>
      </div>
      {upgradeStatus && <div className="mt-4 text-green-700" role="alert">{upgradeStatus}</div>}
    </div>
  );
};

export default UserProfile;
