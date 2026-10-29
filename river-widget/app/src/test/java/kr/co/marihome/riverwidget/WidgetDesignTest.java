package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class WidgetDesignTest {
 @Test public void colorsAreStrictHex(){assertTrue(WidgetDesign.validColor("#286599"));assertTrue(WidgetDesign.validColor("#aAbBcC"));assertFalse(WidgetDesign.validColor("#abc"));assertFalse(WidgetDesign.validColor("javascript:alert(1)"));assertFalse(WidgetDesign.validColor(null));}
 @Test public void defaultsHaveStableNotionIds(){org.json.JSONArray a=WidgetDesign.defaults();assertEquals(3,a.length());assertEquals("그린",a.optJSONObject(0).optString("name"));assertEquals("#286599",a.optJSONObject(2).optString("academyBackground"));assertEquals("none",a.optJSONObject(0).optString("schoolBackground"));for(int i=0;i<3;i++){assertEquals(WidgetDesign.IDS[i],a.optJSONObject(i).optString("id"));assertTrue(a.optJSONObject(i).optBoolean("academyBold"));}}
}
