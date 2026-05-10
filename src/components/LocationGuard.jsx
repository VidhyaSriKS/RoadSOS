import { MapPin, Navigation, Shield, Siren } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

/**
 * LocationGuard
 * Full-screen blocker shown when location permission is permanently denied.
 * onRetry — called after user returns from settings so the hook re-checks.
 */
export default function LocationGuard({ onRetry }) {
  const isNative = Capacitor.isNativePlatform();
  const platform  = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

  const handleOpenSettings = async () => {
    if (isNative) {
      try {
        // Take user straight to app's permission settings
        await NativeSettings.open(
          platform === 'ios'
            ? { optionAndroid: AndroidSettings.ApplicationDetails, optionIOS: IOSSettings.App }
            : { optionAndroid: AndroidSettings.ApplicationDetails, optionIOS: IOSSettings.App }
        );
      } catch (_) {
        // String-key fallback
        try {
          await NativeSettings.open({ optionAndroid: 'ApplicationDetails', optionIOS: 'App' });
        } catch (e) {
          console.error('Could not open settings:', e);
        }
      }
    } else {
      onRetry?.();
    }
  };

  return (
    <div className="location-guard-overlay">
      <div className="lg-radial" />

      <div className="lg-icon-cluster">
        <div className="lg-icon-ring lg-ring-1" />
        <div className="lg-icon-ring lg-ring-2" />
        <div className="lg-icon-ring lg-ring-3" />
        <div className="lg-icon-main">
          <MapPin size={38} color="#e53935" />
        </div>
      </div>

      <div className="lg-content">
        <h1 className="lg-title">Location Access Needed</h1>
        <p className="lg-desc">
          RoadSOS uses your location to instantly find nearby emergency services,
          hospitals, and to share your position during an SOS alert.
        </p>

        <div className="lg-pills">
          <div className="lg-pill"><Siren size={14} /> SOS Alerts</div>
          <div className="lg-pill"><Navigation size={14} /> Nearby Services</div>
          <div className="lg-pill"><Shield size={14} /> Safe &amp; Private</div>
        </div>

        <div className="lg-steps">
          {isNative ? (
            platform === 'ios' ? (
              <>
                <div className="lg-step"><span className="lg-step-num">1</span>Tap <strong>Open Settings</strong> below</div>
                <div className="lg-step"><span className="lg-step-num">2</span>Go to <strong>Location</strong></div>
                <div className="lg-step"><span className="lg-step-num">3</span>Select <strong>While Using the App</strong></div>
              </>
            ) : (
              <>
                <div className="lg-step"><span className="lg-step-num">1</span>Tap <strong>Open Settings</strong> below</div>
                <div className="lg-step"><span className="lg-step-num">2</span>Tap <strong>Permissions → Location</strong></div>
                <div className="lg-step"><span className="lg-step-num">3</span>Select <strong>Allow all the time</strong></div>
              </>
            )
          ) : (
            <>
              <div className="lg-step"><span className="lg-step-num">1</span>Tap <strong>Allow Location</strong> below</div>
              <div className="lg-step"><span className="lg-step-num">2</span>Click <strong>Allow</strong> in the browser prompt</div>
            </>
          )}
        </div>

        <button className="lg-btn-primary" onClick={handleOpenSettings}>
          <MapPin size={18} />
          {isNative ? 'Open App Settings' : 'Allow Location'}
        </button>

        <button className="lg-btn-secondary" onClick={() => onRetry?.()}>
          I've already enabled it — retry
        </button>
      </div>
    </div>
  );
}
