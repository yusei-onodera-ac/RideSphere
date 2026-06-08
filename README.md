# RideSphere

RideSphereは、運転手・車両・予約を地図上で確認しながら配車するためのPWAです。

## 現在のスコープ

初期版では、要件全体の中でも最も重要な **地図付き配車管理PWA** のMVPに絞っています。

主な機能は次のとおりです。

- 管理者による予約登録
- 管理者用の地図風ビュー
- 空き運転手の現在地表示
- 乗車場所・目的地・ルートの表示
- 条件に合う空き運転手の検索とランキング
- 運転手用PWA画面
- 配車通知、承認、運行完了
- 現在地共有ボタン
- 緊急通知ボタン
- Web App ManifestとService WorkerによるPWA基盤

## 開発コマンド

```bash
npm test
npm start
```

`npm start` 実行後、ブラウザで <http://localhost:4173> を開いてください。

## MVP計画

詳細な優先順位と将来拡張は [`docs/mvp-plan.md`](docs/mvp-plan.md) を参照してください。
