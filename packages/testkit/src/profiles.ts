/**
 * 로더는 @preflight/catalog 에 있다. 앱과 테스트가 같은 것을 쓴다.
 * 두 벌이면 "테스트는 통과하는데 앱은 깨지는" 상태가 만들어진다.
 */
export {
  PROFILES_DIR,
  LOCALES_DIR,
  loadLabelBundle,
  loadProfileSources,
  compileAllProfiles,
  type ProfileFile,
} from '@preflight/catalog'
