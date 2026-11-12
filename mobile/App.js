import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

// Change this to your computer's LAN IP when using a physical phone.
const API_BASE = "http://192.168.1.8:5000/api";

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/vehicles`);
      if (!r.ok) throw new Error("API unavailable. Check the backend and API_BASE address.");
      setVehicles(await r.json()); setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function simulate(scenario) {
    const v = vehicles[selected]; if (!v) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/vehicles/${v.id}/simulate`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({scenario})
      });
      const updated = await r.json();
      if (!r.ok) throw new Error(updated.error || "Simulation failed");
      setVehicles(old => old.map(x => x.id === updated.id ? updated : x)); setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const v = vehicles[selected];
  const riskColor = v?.analysis?.risk === "critical" ? "#b42318" : v?.analysis?.risk === "warning" ? "#946000" : "#137a45";

  return <SafeAreaView style={s.safe}><StatusBar style="dark"/><ScrollView contentContainerStyle={s.page}>
    <Text style={s.brand}>🛡️ CargoGuard</Text><Text style={s.sub}>Heavy vehicle load safety · Demo</Text>
    <View style={s.card}><Text style={s.heading}>Fleet vehicles</Text>
      {vehicles.map((x,i)=><Pressable key={x.id} onPress={()=>setSelected(i)} style={[s.vehicle, selected===i && s.selected]}><Text style={s.vehicleText}>{x.id}</Text><Text style={{color:x.analysis.risk==="normal"?"#137a45":"#b42318"}}>{x.analysis.risk.toUpperCase()}</Text></Pressable>)}
      <Pressable style={s.button} onPress={load}><Text style={s.buttonText}>Refresh vehicles</Text></Pressable>
    </View>
    {loading && <ActivityIndicator color="#315fba"/>}
    {error ? <Text style={s.error}>{error}</Text> : null}
    {v && <><View style={s.card}><Text style={s.heading}>{v.name}</Text><Text style={s.sub}>{v.route}</Text>
      <Text style={[s.status,{color:riskColor}]}>{v.analysis.risk.toUpperCase()} STATUS</Text>
      <Metric label="Cargo load" value={`${v.loadKg.toLocaleString()} kg`}/>
      <Metric label="Capacity" value={`${v.capacityKg.toLocaleString()} kg`}/>
      <Metric label="Load percentage" value={`${v.analysis.loadPercent}%`}/>
      <Metric label="Axle reading difference" value={`${v.analysis.axleImbalancePercent}%`}/>
      <Metric label="Front axle" value={`${v.frontAxleKg.toLocaleString()} kg`}/>
      <Metric label="Rear axle" value={`${v.rearAxleKg.toLocaleString()} kg`}/>
      <Metric label="Movement score" value={`${v.movementScore}/100`}/>
    </View>
    <View style={s.card}><Text style={s.heading}>Safety alerts</Text>
      {v.analysis.alerts.length ? v.analysis.alerts.map((a,i)=><View key={i} style={s.alert}><Text style={s.alertTitle}>{a.title}</Text><Text>{a.detail}</Text></View>) : <Text>No demo rules triggered. This is not proof of real-world safety.</Text>}
    </View>
    <View style={s.card}><Text style={s.heading}>Try a simulation</Text>
      {["normal","overload","uneven","shift"].map(x=><Pressable key={x} style={s.button} onPress={()=>simulate(x)}><Text style={s.buttonText}>{x==="normal"?"Reset to normal":`Simulate ${x}`}</Text></Pressable>)}
    </View></>}
    <Text style={s.foot}>Synthetic demo readings only. Not certified for real vehicle safety decisions.</Text>
  </ScrollView></SafeAreaView>;
}
function Metric({label,value}) { return <View style={s.metric}><Text style={s.sub}>{label}</Text><Text style={s.value}>{value}</Text></View>; }
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f3f6fb"},page:{padding:18,paddingBottom:35},
 brand:{fontSize:27,fontWeight:"800",color:"#17243b"},sub:{color:"#758198",marginTop:4,marginBottom:10},
 card:{backgroundColor:"white",padding:17,borderRadius:14,marginTop:15,borderWidth:1,borderColor:"#e5eaf2"},
 heading:{fontSize:18,fontWeight:"800",color:"#17243b",marginBottom:10},
 vehicle:{padding:13,borderRadius:9,backgroundColor:"#f7f9fc",marginVertical:4,flexDirection:"row",justifyContent:"space-between"},
 selected:{borderWidth:1,borderColor:"#477bd0"},vehicleText:{fontWeight:"700",color:"#24344d"},
 button:{backgroundColor:"#244e91",padding:13,borderRadius:9,alignItems:"center",marginTop:9},
 buttonText:{color:"white",fontWeight:"700",textTransform:"capitalize"},
 status:{fontWeight:"900",fontSize:16,marginVertical:10},
 metric:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#edf0f5"},
 value:{fontWeight:"800",fontSize:17,color:"#17243b",marginTop:3},
 alert:{padding:12,backgroundColor:"#fff4e3",borderRadius:9,marginVertical:5},
 alertTitle:{fontWeight:"800",marginBottom:4,color:"#805500"},
 error:{color:"#b42318",marginTop:10},foot:{textAlign:"center",fontSize:11,color:"#8994a6",marginTop:18}
});
