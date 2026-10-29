package kr.co.marihome.riverwidget;
import java.util.Set;
/** Reject another app, a stale/unexpected APK or a changed signing identity. */
final class UpdateIdentity {
 static boolean matches(String own,String candidate,long installed,long next,long expected,Set<String> trusted,Set<String> actual){
  return own!=null&&own.equals(candidate)&&next>installed&&next==expected&&trusted!=null&&!trusted.isEmpty()&&trusted.equals(actual);
 }
 private UpdateIdentity(){}
}
