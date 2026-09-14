# pure-admin 精简壳来源

布局导航与按钮权限组件根据 [pure-admin-thin](https://github.com/pure-admin/pure-admin-thin) 裁剪。
参考版本：6.2.0，提交 `f0ff132561ab684bb78379239adf29f9a38ac7f1`。
保留许可证：`licenses/pure-admin-MIT.txt`。

- `src/layouts/SidebarItem.vue`：裁剪递归 Element Plus 菜单、单子菜单展开逻辑，使用本项目的类型、图标和权限存储。
- `src/components/Auth.vue`：将 ReAuth 的条件 slot 渲染改写为 script setup SFC。
- `src/layouts/AppLayout.vue`：按其侧栏、顶栏、内容区结构重新实现采购业务布局；移除多主题、标签缓存、iframe 等无关能力。

本项目不是未经修改的完整 pure-admin 模板。文档提到的 7.0.0 不是本次取得的精简仓库版本；实际构建工具已单独升级为 Vite 8。业务页面、API、Mock 状态机和视觉样式为本项目新增。
