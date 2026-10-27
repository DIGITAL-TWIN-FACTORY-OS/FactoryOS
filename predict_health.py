"""
Multimodal Health Score Prediction Service
Trained on NASA Ames & UC Berkeley Milling Machine Dataset (Matsuura MC-510V)
and AI4I Predictive Maintenance Dataset.

Usage:
  python predict_health.py --name "Matsuura MC-510V" --vibration 2.5 --current 8.8 --temp 54.0 --ae 0.12
"""

import sys
import os
import argparse
import joblib
import numpy as np

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "frontend",
    "src",
    "services",
    "models",
    "multimodal_health_model.joblib"
)

def load_multimodal_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model bundle not found at {MODEL_PATH}")
    return joblib.load(MODEL_PATH)

def predict_machine_health(vibration=2.2, current=8.5, temperature=52.0, ae=0.10, doc=1.0, feed=0.25, material=1):
    bundle = load_multimodal_model()
    rf = bundle['mill_rf_health']
    gb = bundle['mill_gb_health']
    rf_vb = bundle['mill_rf_vb']
    
    # Feature engineering matching NASA dataset signals
    dc_mean = current * 0.45
    ac_rms = current * 0.55
    vt_rms = vibration * 0.45
    vs_rms = vibration * 0.55
    aet_rms = ae * 0.48
    aes_rms = ae * 0.52
    vs_to_vt = vs_rms / (vt_rms + 1e-6)
    aes_to_aet = aes_rms / (aet_rms + 1e-6)
    ac_to_dc = ac_rms / (dc_mean + 1e-6)
    spindle_power = dc_mean * doc * feed
    
    X = np.array([[
        doc, feed, material,
        ac_rms, dc_mean,
        vt_rms, vs_rms,
        aet_rms, aes_rms,
        vs_to_vt, aes_to_aet, ac_to_dc, spindle_power
    ]])
    
    pred_rf = rf.predict(X)[0]
    pred_gb = gb.predict(X)[0]
    health_score = float(np.clip(0.5 * pred_rf + 0.5 * pred_gb, 0.0, 100.0))
    pred_vb = float(np.clip(rf_vb.predict(X)[0], 0.0, 1.5))
    failure_prob = float(np.clip(100.0 - health_score, 0.0, 100.0))
    
    status = "running" if health_score >= 70 else ("warning" if health_score >= 35 else "critical")
    
    return {
        'health_score': round(health_score, 1),
        'status': status,
        'flank_wear_vb_mm': round(pred_vb, 3),
        'failure_probability_pct': round(failure_prob, 1),
        'sensor_inputs': {
            'vibration_spindle_rms': round(vs_rms, 3),
            'vibration_table_rms': round(vt_rms, 3),
            'acoustic_emission_rms': round(aes_rms, 3),
            'spindle_motor_dc_current': round(dc_mean, 2),
            'process_temperature': round(temperature, 1),
        }
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict Machine Health Score using Multimodal AI")
    parser.add_argument("--vibration", type=float, default=2.2, help="Vibration RMS in mm/s or g")
    parser.add_argument("--current", type=float, default=8.5, help="Spindle Motor Current in Amps")
    parser.add_argument("--temp", type=float, default=52.0, help="Operating Temperature in deg C")
    parser.add_argument("--ae", type=float, default=0.10, help="Acoustic Emission in Volts RMS")
    args = parser.parse_args()
    
    res = predict_machine_health(vibration=args.vibration, current=args.current, temperature=args.temp, ae=args.ae)
    print("=== Multimodal Prediction Result ===")
    for k, v in res.items():
        print(f"{k}: {v}")
