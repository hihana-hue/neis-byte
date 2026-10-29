package kr.co.marihome.riverwidget;
import org.junit.Test;
import java.util.Set;
import static org.junit.Assert.*;
public class UpdateIdentityTest {
 @Test public void acceptsOnlyExpectedNewerOwnSignedUpdate(){assertTrue(UpdateIdentity.matches("app","app",36,37,37,Set.of("key"),Set.of("key")));}
 @Test public void rejectsSubstitutedAndStaleFiles(){
  assertFalse(UpdateIdentity.matches("app","other",36,37,37,Set.of("key"),Set.of("key")));
  assertFalse(UpdateIdentity.matches("app","app",36,36,36,Set.of("key"),Set.of("key")));
  assertFalse(UpdateIdentity.matches("app","app",36,37,38,Set.of("key"),Set.of("key")));
  assertFalse(UpdateIdentity.matches("app","app",36,37,37,Set.of("key"),Set.of("other")));
  assertFalse(UpdateIdentity.matches("app","app",36,37,37,Set.of(),Set.of()));
 }
}
